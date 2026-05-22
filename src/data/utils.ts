const sortedYearsCache = new WeakMap<Record<number, number>, number[]>();

function getSortedYears(data: Record<number, number>): number[] {
  let cached = sortedYearsCache.get(data);
  if (!cached) {
    cached = Object.keys(data).map(Number).sort((a, b) => a - b);
    sortedYearsCache.set(data, cached);
  }
  return cached;
}

export function interpolateYear(data: Record<number, number>, year: number): number {
  if (data[year] !== undefined) return data[year];

  const years = getSortedYears(data);
  if (years.length === 0) return 0;

  if (year <= years[0]) return data[years[0]];
  if (year >= years[years.length - 1]) return data[years[years.length - 1]];

  let lo = years[0];
  let hi = years[years.length - 1];
  for (const y of years) {
    if (y <= year) lo = y;
    if (y >= year && y < hi) hi = y;
  }

  if (lo === hi) return data[lo];

  const t = (year - lo) / (hi - lo);
  return data[lo] + t * (data[hi] - data[lo]);
}

export function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}
