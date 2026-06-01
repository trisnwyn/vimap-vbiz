import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

export type TrendDirection = 'up' | 'down' | 'stable';

export interface Trend {
  direction: TrendDirection;
  pctChange: number;
}

export interface RiskRow {
  id: string;
  name: string;
  region: string;
  score: number;
}

export interface ForecastSummary {
  year: number;
  scope: 'national' | 'province';
  /** Total forest cover (ha) for the scope in `year`. */
  forestNow: number;
  /** Linear-regression projected forest cover (ha) in 2030. */
  forest2030: number;
  /** % change from now → 2030. */
  changePct2030: number;
  /** Mean annual loss rate across the scope. */
  avgLossRate: number;
  /** Total forest loss (ha) in `year`. */
  totalLoss: number;
  /** Highest-risk provinces in the scope (desc by score). */
  topRisks: RiskRow[];
}

/** Direction + total % change across the earliest→latest year in a series. */
export function computeTrend(data: Record<number, number>): Trend {
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return { direction: 'stable', pctChange: 0 };
  const first = data[years[0]];
  const last = data[years[years.length - 1]];
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  return {
    direction: Math.abs(pct) < 2 ? 'stable' : pct > 0 ? 'up' : 'down',
    pctChange: pct,
  };
}

/** Ordinary least-squares projection of a year→value series to 2030. */
export function forecast2030(data: Record<number, number>): number {
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return data[years[0]] ?? 0;
  const n = years.length;
  const sumX = years.reduce((s, y) => s + y, 0);
  const sumY = years.reduce((s, y) => s + data[y], 0);
  const sumXY = years.reduce((s, y) => s + y * data[y], 0);
  const sumX2 = years.reduce((s, y) => s + y * y, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, Math.round(slope * 2030 + intercept));
}

/** Weighted 0–100 deforestation risk score for a province in a given year. */
export function computeRiskScore(provinceId: string, year: number): number {
  const p = provinces.find((pr) => pr.id === provinceId);
  if (!p) return 0;
  const lossRate = interpolateYear(p.lossRate, year);
  const lossTrend = computeTrend(p.forestLoss);
  const coverTrend = computeTrend(p.forestCover);

  let score = 0;
  score += Math.min(40, lossRate * 1500);
  if (lossTrend.direction === 'up' || lossTrend.pctChange > -10) score += 15;
  if (coverTrend.direction === 'down') score += Math.min(25, Math.abs(coverTrend.pctChange));
  if (['coffee', 'rubber', 'shrimp'].includes(p.primaryCrop)) score += 15;
  if (p.region === 'Central Highlands' || p.region === 'Southeast') score += 5;

  return Math.min(100, Math.round(score));
}

/**
 * Aggregate forecast + risk summary for the whole country or a single province.
 * Pure + synchronous — safe to call on client or server.
 */
export function getForecastSummary(year: number, selectedProvince?: string | null): ForecastSummary {
  const source = selectedProvince
    ? provinces.filter((p) => p.id === selectedProvince)
    : provinces;

  const forestNow = source.reduce((s, p) => s + interpolateYear(p.forestCover, year), 0);
  const totalLoss = source.reduce((s, p) => s + interpolateYear(p.forestLoss, year), 0);
  const avgLossRate = source.length
    ? source.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / source.length
    : 0;

  const forest2030 = source.reduce((s, p) => s + forecast2030(p.forestCover), 0);
  const changePct2030 = forestNow > 0 ? ((forest2030 - forestNow) / forestNow) * 100 : 0;

  const topRisks: RiskRow[] = source
    .map((p) => ({ id: p.id, name: p.name, region: p.region, score: computeRiskScore(p.id, year) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    year,
    scope: selectedProvince ? 'province' : 'national',
    forestNow,
    forest2030,
    changePct2030,
    avgLossRate,
    totalLoss,
    topRisks,
  };
}
