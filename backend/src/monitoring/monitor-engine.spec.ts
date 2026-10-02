import {
  advanceRule,
  verificationStep,
  operating,
  validateMonitoring,
  type RuleState,
} from './monitor-engine';
import type { AlarmRule } from '../tag-mapping/alarm-rules';
const rule: AlarmRule = {
  name: 'High temp',
  nodeId: 'temp',
  tagName: 'temp',
  integrationId: 'plc',
  condition: 'GT',
  threshold: 100,
  severity: 'CRITICAL',
  delaySeconds: 10,
  clearSeconds: 5,
  resetThreshold: 95,
};
const reading = (value: number, good = true) => ({
  nodeId: 'temp',
  value,
  good,
});
const step = (
  value: number,
  time: number,
  previous?: RuleState,
  continuous = true,
) => advanceRule(rule, '0', reading(value), previous, time, continuous);
describe('Persistent alarm confirmation and repair verification', () => {
  it('ignores a short spike and restarts confirmation after it', () => {
    let s = step(110, 0);
    expect(s.state).toBe('PENDING');
    s = step(80, 9000, s);
    expect(s.state).toBe('INACTIVE');
    s = step(110, 10000, s);
    expect(s.progressSeconds).toBe(0);
    s = step(110, 19000, s);
    expect(s.state).toBe('PENDING');
    s = step(110, 20000, s);
    expect(s.state).toBe('ACTIVE');
  });
  it('resets a pending alarm after a gap or bad quality', () => {
    let s = step(110, 0);
    s = step(110, 20000, s, false);
    expect(s.state).toBe('PENDING');
    s = advanceRule(rule, '0', reading(110, false), s, 21000, true);
    expect(s.state).toBe('UNKNOWN');
    s = step(110, 22000, s);
    expect(s.progressSeconds).toBe(0);
  });
  it('supports immediate confirmation explicitly configured as zero', () => {
    expect(
      advanceRule(
        { ...rule, delaySeconds: 0 },
        '0',
        reading(110),
        undefined,
        0,
        false,
      ).state,
    ).toBe('ACTIVE');
  });
  it('uses hysteresis and stable recovery before clearing', () => {
    let s = step(110, 0);
    s = step(110, 10000, s);
    s = step(98, 11000, s);
    expect(s.state).toBe('ACTIVE');
    s = step(94, 12000, s);
    expect(s.state).toBe('RECOVERING');
    s = step(94, 17000, s);
    expect(s.state).toBe('INACTIVE');
  });
  it('retains a confirmed alarm through loss of signal without treating it as recovered', () => {
    let s = step(110, 0);
    s = step(110, 10000, s);
    s = advanceRule(rule, '0', undefined, s, 11000, true);
    expect(s.latched).toBe(true);
    expect(s.state).toBe('UNKNOWN');
  });
  it('does not treat non-finite readings as recovery', () => {
    const active = step(110, 10000, step(110, 0));
    expect(
      advanceRule(rule, '0', reading(NaN), active, 11000, true).state,
    ).toBe('UNKNOWN');
  });
  const base = {
    now: 20000,
    continuous: true,
    operating: true,
    rules: [step(80, 0)],
    since: 0,
    failureSince: null,
    seconds: 15,
  };
  it('does not accept stopped equipment, missing data or pending alarms as repaired', () => {
    expect(verificationStep({ ...base, operating: false }).result).toBe(
      'WAITING',
    );
    expect(verificationStep({ ...base, operating: null }).since).toBeNull();
    expect(verificationStep({ ...base, rules: [step(110, 0)] }).result).toBe(
      'WAITING',
    );
  });
  it('passes only after a stable operating window and restarts after interruption', () => {
    expect(verificationStep({ ...base, now: 14000 }).result).toBe('VERIFYING');
    expect(verificationStep(base).result).toBe('PASSED');
    expect(verificationStep({ ...base, continuous: false }).result).toBe(
      'VERIFYING',
    );
  });
  it('fails a reported repair only after persistent active fault under load', () => {
    const active = step(110, 10000, step(110, 0));
    expect(
      verificationStep({ ...base, rules: [active], failureSince: 15000 })
        .result,
    ).toBe('CHECKING_FAULT');
    expect(
      verificationStep({ ...base, rules: [active], failureSince: 10000 })
        .result,
    ).toBe('FAILED');
  });
  it('requires both running and load criteria', () => {
    const cfg = validateMonitoring({
      enabled: true,
      runNodeId: 'run',
      runCondition: 'TRUE',
      runThreshold: 0,
      loadNodeId: 'load',
      minimumLoad: 10,
      verificationSeconds: 15,
    });
    expect(
      operating(cfg, [
        { nodeId: 'run', value: true, good: true },
        { nodeId: 'load', value: 0, good: true },
      ]),
    ).toBe(false);
    expect(
      operating(cfg, [
        { nodeId: 'run', value: true, good: true },
        { nodeId: 'load', value: 80, good: true },
      ]),
    ).toBe(true);
    expect(() => validateMonitoring({ ...cfg, runNodeId: '' })).toThrow();
  });
});
