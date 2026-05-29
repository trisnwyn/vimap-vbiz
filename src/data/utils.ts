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

  // Find the two bracketing years: lo <= year < hi
  let lo = years[0];
  let hi = years[years.length - 1];
  for (let i = 0; i < years.length - 1; i++) {
    if (years[i] <= year && years[i + 1] >= year) {
      lo = years[i];
      hi = years[i + 1];
      break;
    }
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
