import { BadRequestException } from '@nestjs/common';
import type { AlarmRule } from '../tag-mapping/alarm-rules';
export type Reading = {
  nodeId: string;
  value: unknown;
  good: boolean;
  statusCode?: string;
  timestamp?: string | null;
};
export type MonitoringConfig = {
  enabled: boolean;
  runNodeId: string;
  runCondition: 'TRUE' | 'GT';
  runThreshold: number;
  loadNodeId: string;
  minimumLoad: number;
  verificationSeconds: number;
};
export type RuleState = {
  key: string;
  name: string;
  severity: string;
  state: 'INACTIVE' | 'PENDING' | 'ACTIVE' | 'RECOVERING' | 'UNKNOWN';
  latched: boolean;
  since: number | null;
  clearSince: number | null;
  progressSeconds: number;
  delaySeconds: number;
};
export function validateMonitoring(value: unknown): MonitoringConfig {
  const v = value as MonitoringConfig;
  if (!v || typeof v !== 'object' || typeof v.enabled !== 'boolean')
    throw new BadRequestException('Invalid monitoring settings');
  if (!v.enabled)
    return {
      enabled: false,
      runNodeId: '',
      runCondition: 'TRUE',
      runThreshold: 0,
      loadNodeId: '',
      minimumLoad: 0,
      verificationSeconds: 15,
    };
  if (
    ![v.runNodeId, v.loadNodeId].every(
      (id) =>
        typeof id === 'string' && id.trim().length > 0 && id.length <= 1024,
    ) ||
    !['TRUE', 'GT'].includes(v.runCondition) ||
    !Number.isFinite(v.runThreshold) ||
    !Number.isFinite(v.minimumLoad) ||
    v.minimumLoad < 0 ||
    !Number.isInteger(v.verificationSeconds) ||
    v.verificationSeconds < 5 ||
    v.verificationSeconds > 3600
  )
    throw new BadRequestException(
      'Monitoring needs a running tag, a load tag and a 5–3600 second verification window',
    );
  return {
    enabled: true,
    runNodeId: v.runNodeId.trim(),
    runCondition: v.runCondition,
    runThreshold: v.runThreshold,
    loadNodeId: v.loadNodeId.trim(),
    minimumLoad: v.minimumLoad,
    verificationSeconds: v.verificationSeconds,
  };
}
export function condition(
  rule: Pick<AlarmRule, 'condition' | 'threshold'>,
  reading?: Reading,
): boolean | null {
  if (!reading?.good || reading.value == null) return null;
  const v = reading.value;
  if (rule.condition === 'TRUE' || rule.condition === 'FALSE')
    return typeof v === 'boolean' || v === 0 || v === 1
      ? Boolean(v) === (rule.condition === 'TRUE')
      : null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (rule.condition === 'BIT_SET')
    return Number.isInteger(v) && v >= -2147483648 && v <= 4294967295
      ? ((v >>> rule.threshold) & 1) === 1
      : null;
  return rule.condition === 'GT'
    ? v > rule.threshold
    : rule.condition === 'LT'
      ? v < rule.threshold
      : v === rule.threshold;
}
export function advanceRule(
  rule: AlarmRule,
  key: string,
  reading: Reading | undefined,
  previous: RuleState | undefined,
  now: number,
  continuous: boolean,
): RuleState {
  const delay = rule.delaySeconds ?? 10,
    clear = rule.clearSeconds ?? 5;
  const state: RuleState = {
    key,
    name: rule.name,
    severity: rule.severity,
    state: 'INACTIVE',
    latched: previous?.latched ?? false,
    since: continuous ? (previous?.since ?? null) : null,
    clearSince: continuous ? (previous?.clearSince ?? null) : null,
    progressSeconds: 0,
    delaySeconds: delay,
  };
  let active = condition(rule, reading);
  if (
    state.latched &&
    rule.resetThreshold !== undefined &&
    reading?.good &&
    typeof reading.value === 'number' &&
    Number.isFinite(reading.value)
  ) {
    if (rule.condition === 'GT') active = reading.value > rule.resetThreshold;
    if (rule.condition === 'LT') active = reading.value < rule.resetThreshold;
  }
  if (active === null)
    return { ...state, state: 'UNKNOWN', since: null, clearSince: null };
  if (active) {
    state.clearSince = null;
    state.since ??= now;
    state.progressSeconds = (now - state.since) / 1000;
    if (state.latched || state.progressSeconds >= delay) {
      state.latched = true;
      state.state = 'ACTIVE';
    } else state.state = 'PENDING';
  } else {
    state.since = null;
    if (state.latched) {
      state.clearSince ??= now;
      state.progressSeconds = (now - state.clearSince) / 1000;
      state.state = 'RECOVERING';
      if (state.progressSeconds >= clear) {
        state.latched = false;
        state.state = 'INACTIVE';
        state.clearSince = null;
      }
    } else {
      state.state = 'INACTIVE';
      state.clearSince = null;
    }
  }
  return state;
}
export function operating(
  config: MonitoringConfig,
  readings: Reading[],
): boolean | null {
  const running = condition(
    { condition: config.runCondition, threshold: config.runThreshold },
    readings.find((r) => r.nodeId === config.runNodeId),
  );
  const loaded = condition(
    { condition: 'GT', threshold: config.minimumLoad },
    readings.find((r) => r.nodeId === config.loadNodeId),
  );
  if (running === null || loaded === null) return null;
  return running && loaded;
}
export function verificationStep(input: {
  now: number;
  continuous: boolean;
  operating: boolean | null;
  rules: RuleState[];
  since: number | null;
  failureSince: number | null;
  seconds: number;
}) {
  let since = input.continuous ? input.since : null;
  let failureSince = input.continuous ? input.failureSince : null;
  if (
    input.operating !== true ||
    input.rules.some((r) => r.state === 'UNKNOWN')
  )
    return { since: null, failureSince: null, result: 'WAITING' as const };
  if (input.rules.some((r) => r.state === 'ACTIVE')) {
    since = null;
    failureSince ??= input.now;
    return {
      since,
      failureSince,
      result:
        input.now - failureSince >= 10000
          ? ('FAILED' as const)
          : ('CHECKING_FAULT' as const),
    };
  }
  failureSince = null;
  if (!input.rules.length || input.rules.some((r) => r.state !== 'INACTIVE'))
    return { since: null, failureSince, result: 'WAITING' as const };
  since ??= input.now;
  return {
    since,
    failureSince,
    result:
      input.now - since >= input.seconds * 1000
        ? ('PASSED' as const)
        : ('VERIFYING' as const),
  };
}
