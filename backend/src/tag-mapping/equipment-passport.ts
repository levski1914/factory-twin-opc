import { BadRequestException } from '@nestjs/common';
export function validatePassport(
  value: unknown,
): Record<string, string | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Equipment passport must be an object');
  const result: Record<string, string | number> = {};
  const textFields = ['manufacturer', 'model', 'serialNumber', 'reference'];
  const numberFields = ['ratedPowerKw', 'ratedCurrentA', 'maxTemperatureC'];
  for (const [key, item] of Object.entries(value)) {
    if (textFields.includes(key)) {
      if (typeof item !== 'string' || item.length > 256)
        throw new BadRequestException(`Invalid passport field: ${key}`);
      if (item.trim()) result[key] = item.trim();
    } else if (numberFields.includes(key)) {
      if (
        typeof item !== 'number' ||
        !Number.isFinite(item) ||
        (key !== 'maxTemperatureC' && item <= 0) ||
        (key === 'maxTemperatureC' && item < -273.15)
      )
        throw new BadRequestException(`Invalid passport measurement: ${key}`);
      result[key] = item;
    } else throw new BadRequestException(`Unknown passport field: ${key}`);
  }
  return result;
}
