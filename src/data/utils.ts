/**
 * Interpolate a value from a year-keyed record.
 * If the exact year exists, return it.
 * Otherwise, linearly interpolate between the two nearest bracket years.
 * Falls back to the nearest available year if outside the data range.
 */
export function interpolateYear(data: Record<number, number>, year: number): number {
  if (data[year] !== undefined) return data[year];

  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return 0;

  // Clamp to range
  if (year <= years[0]) return data[years[0]];
  if (year >= years[years.length - 1]) return data[years[years.length - 1]];

  // Find bracketing years
  let lo = years[0];
  let hi = years[years.length - 1];
  for (const y of years) {
    if (y <= year) lo = y;
    if (y >= year && y < hi) hi = y;
  }

  if (lo === hi) return data[lo];

  // Linear interpolation
  const t = (year - lo) / (hi - lo);
  return data[lo] + t * (data[hi] - data[lo]);
}
