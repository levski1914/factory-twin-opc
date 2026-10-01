import { BadRequestException } from '@nestjs/common';
export type AlarmRule = {
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
