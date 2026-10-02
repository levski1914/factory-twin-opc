import { BadRequestException } from '@nestjs/common';
export type AlarmRule = {
  delaySeconds?: number;
  clearSeconds?: number;
  resetThreshold?: number;
  name: string;
  nodeId: string;
  tagName: string;
  integrationId: string;
  condition: 'TRUE' | 'FALSE' | 'GT' | 'LT' | 'EQ' | 'BIT_SET';
  threshold: number;
  severity: 'WARNING' | 'CRITICAL';
};
export function validateAlarmRules(
  value: unknown,
  integrationId: string,
): AlarmRule[] {
  if (!Array.isArray(value) || value.length > 64)
    throw new BadRequestException('Provide at most 64 alarm rules');
  return value.map((rule) => {
    if (
      rule &&
      ([rule.delaySeconds, rule.clearSeconds].some(
        (v) => v !== undefined && (!Number.isInteger(v) || v < 0 || v > 3600),
      ) ||
        (rule.resetThreshold !== undefined &&
          (!Number.isFinite(rule.resetThreshold) ||
            !['GT', 'LT'].includes(rule.condition) ||
            (rule.condition === 'GT' && rule.resetThreshold > rule.threshold) ||
            (rule.condition === 'LT' && rule.resetThreshold < rule.threshold))))
    )
      throw new BadRequestException(
        'Invalid confirmation/recovery delay or reset threshold',
      );
    if (
      !rule ||
      typeof rule.name !== 'string' ||
      !rule.name.trim() ||
      rule.name.length > 120 ||
      typeof rule.nodeId !== 'string' ||
      !rule.nodeId.trim() ||
      rule.nodeId.length > 1024 ||
      typeof rule.tagName !== 'string' ||
      !rule.tagName.trim() ||
      rule.tagName.length > 256 ||
      rule.integrationId !== integrationId ||
      !['TRUE', 'FALSE', 'GT', 'LT', 'EQ', 'BIT_SET'].includes(
        rule.condition,
      ) ||
      !['WARNING', 'CRITICAL'].includes(rule.severity) ||
      typeof rule.threshold !== 'number' ||
      !Number.isFinite(rule.threshold) ||
      (rule.condition === 'BIT_SET' &&
        (!Number.isInteger(rule.threshold) ||
          rule.threshold < 0 ||
          rule.threshold > 31))
    )
      throw new BadRequestException(
        'Each alarm needs a name, PLC tag, valid condition and severity; bit index must be 0–31',
      );
    return {
      ...(rule.delaySeconds !== undefined
        ? { delaySeconds: rule.delaySeconds }
        : {}),
      ...(rule.clearSeconds !== undefined
        ? { clearSeconds: rule.clearSeconds }
        : {}),
      ...(rule.resetThreshold !== undefined
        ? { resetThreshold: rule.resetThreshold }
        : {}),
      name: rule.name.trim(),
      nodeId: rule.nodeId.trim(),
      tagName: rule.tagName.trim(),
      integrationId,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
    };
  });
}
