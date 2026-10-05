export function zoomHistoryRange(
  current: [number, number],
  bounds: [number, number],
  delta: number,
  fraction: number,
): [number, number] {
  const size = Math.min(
    bounds[1] - bounds[0],
    Math.max(1000, (current[1] - current[0]) * (delta > 0 ? 1.25 : 0.8)),
  );
  const anchor = current[0] + (current[1] - current[0]) * fraction;
  const from = Math.max(
    bounds[0],
    Math.min(bounds[1] - size, anchor - size * fraction),
  );
  return [Math.floor(from), Math.ceil(from + size)];
}
