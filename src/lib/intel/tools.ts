// ─────────────────────────────────────────────────────────────────────────
// Internal data tools for VinMap Intelligence.
//
// These are the agent's "private knowledge": province-level forest data
// (local, instant), live NASA FIRMS fire activity, and World Bank forest
// area. Each tool returns plain typed data the orchestrator can feed to the
// LLM or cross-reference against web findings. Network tools degrade
// gracefully — a failure returns an `available: false` shape, never throws.
// ─────────────────────────────────────────────────────────────────────────

import * as turf from '@turf/turf';
import { provinces as staticProvinces } from '@/data/provinces';
import { getHydratedProvinces } from './province-hydration';
import { interpolateYear } from '@/data/utils';
import type { Commodity } from '@/types/intel';

// ── Province statistics (local, synchronous) ──────────────────────────────

export interface ProvinceStat {
  id: string;
  name: string;
  nameVi: string;
  region: string;
  primaryCrop: string;
  area: number;
  year: number;
  forestCover: number; // ha
  annualLoss: number; // ha/yr
  lossRate: number; // fraction (0–1)
  lossRatePct: string; // "1.36%"
  /** % change in forest cover vs. the 2000 baseline. */
  coverChangePct: number;
}

function toStat(p: (typeof staticProvinces)[number], year: number): ProvinceStat {
  const forestCover = interpolateYear(p.forestCover, year);
  const baseline = interpolateYear(p.forestCover, 2000);
  const lossRate = interpolateYear(p.lossRate, year);
  return {
    id: p.id,
    name: p.name,
    nameVi: p.nameVi,
    region: p.region,
    primaryCrop: p.primaryCrop,
    area: p.area,
    year,
    forestCover: Math.round(forestCover),
    annualLoss: Math.round(interpolateYear(p.forestLoss, year)),
    lossRate,
    lossRatePct: (lossRate * 100).toFixed(2) + '%',
    coverChangePct: baseline > 0 ? ((forestCover - baseline) / baseline) * 100 : 0,
  };
}

export async function getProvinceStats(provinceId: string, year: number): Promise<ProvinceStat | null> {
  const list = await getHydratedProvinces();
  const p = list.find((pr) => pr.id === provinceId);
  return p ? toStat(p, year) : null;
}

export async function getProvincesByCommodity(commodity: Commodity, year: number): Promise<ProvinceStat[]> {
  const list = await getHydratedProvinces();
  return list
    .filter((p) => p.primaryCrop === commodity)
    .map((p) => toStat(p, year))
    .sort((a, b) => b.lossRate - a.lossRate);
}

export interface NationalSummary {
  year: number;
  scope: 'national' | 'selection';
  provinceCount: number;
  totalForest: number; // ha
  totalLoss: number; // ha/yr
  avgLossRate: number; // fraction
  avgLossRatePct: string;
  highRiskCount: number; // provinces with lossRate >= 1.5%/yr
}

/** Aggregate forest stats, optionally scoped to a subset of provinces. */
export async function getNationalSummary(year: number, scopeIds?: string[]): Promise<NationalSummary> {
  const all = await getHydratedProvinces();
  const scoped =
    scopeIds && scopeIds.length > 0 ? all.filter((p) => scopeIds.includes(p.id)) : all;
  const list = scoped.length > 0 ? scoped : all;

  const totalForest = list.reduce((s, p) => s + interpolateYear(p.forestCover, year), 0);
  const totalLoss = list.reduce((s, p) => s + interpolateYear(p.forestLoss, year), 0);
  const avgLossRate = list.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / list.length;
  const highRiskCount = list.filter((p) => interpolateYear(p.lossRate, year) >= 0.015).length;

  return {
    year,
    scope: scopeIds && scopeIds.length > 0 ? 'selection' : 'national',
    provinceCount: list.length,
    totalForest: Math.round(totalForest),
    totalLoss: Math.round(totalLoss),
    avgLossRate,
    avgLossRatePct: (avgLossRate * 100).toFixed(2) + '%',
    highRiskCount,
  };
}

/** Top-N provinces by loss rate, optionally scoped. */
export async function getTopRiskProvinces(year: number, n = 10, scopeIds?: string[]): Promise<ProvinceStat[]> {
  const all = await getHydratedProvinces();
  const scoped =
    scopeIds && scopeIds.length > 0 ? all.filter((p) => scopeIds.includes(p.id)) : all;
  return (scoped.length > 0 ? scoped : all)
    .map((p) => toStat(p, year))
    .sort((a, b) => b.lossRate - a.lossRate)
    .slice(0, n);
}

// ── NASA FIRMS active fires (live) ────────────────────────────────────────

const VN_BBOX = '102.14,8.18,109.46,23.39';
const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

export interface FireHotspot {
  lat: number;
  lng: number;
  brightness: number;
  date: string;
  confidence: string;
  frp: number;
}

export interface ActiveFiresResult {
  available: boolean;
  count: number;
  hotspots: FireHotspot[];
  days: number;
  reason?: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = false;
      } else current += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else current += ch;
  }
  fields.push(current.trim());
  return fields;
}

function parseFirmsCsv(csv: string): FireHotspot[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const vals = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = vals[i] ?? '';
      });
      return {
        lat: parseFloat(row['latitude'] ?? '0'),
        lng: parseFloat(row['longitude'] ?? '0'),
        brightness: parseFloat(row['bright_ti4'] ?? row['brightness'] ?? '0'),
        date: row['acq_date'] ?? '',
        confidence: row['confidence'] ?? '',
        frp: parseFloat(row['frp'] ?? '0'),
      };
    })
    .filter((h) => h.lat !== 0 && h.lng !== 0);
}

/**
 * Fetch live VIIRS fire hotspots over Vietnam. Returns `available:false`
 * (not an error) when FIRMS_MAP_KEY is unset or the API is unreachable,
 * so the agent can note "live fire data unavailable" and continue.
 */
export async function getActiveFires(days = 3, signal?: AbortSignal): Promise<ActiveFiresResult> {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    return { available: false, count: 0, hotspots: [], days, reason: 'FIRMS_MAP_KEY not configured' };
  }
  const dayCount = Math.min(5, Math.max(1, days));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const url = `${FIRMS_BASE}/${mapKey}/VIIRS_SNPP_NRT/${VN_BBOX}/${dayCount}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { available: false, count: 0, hotspots: [], days: dayCount, reason: `FIRMS ${res.status}` };
    }
    const hotspots = parseFirmsCsv(await res.text());
    return { available: true, count: hotspots.length, hotspots, days: dayCount };
  } catch (err) {
    return {
      available: false,
      count: 0,
      hotspots: [],
      days: dayCount,
      reason: (err as Error)?.name === 'AbortError' ? 'FIRMS timeout' : 'FIRMS unreachable',
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}

export interface ProvinceFireCount {
  provinceId: string;
  name: string;
  fires: number;
}

/**
 * Bucket fire hotspots to their nearest province centroid (within `radiusKm`).
 * Province polygons aren't in the dataset, so we use nearest-centroid
 * assignment — a reasonable proxy for "which province is this fire in".
 */
export function bucketFiresToProvinces(
  hotspots: FireHotspot[],
  scopeIds?: string[],
  radiusKm = 60,
): ProvinceFireCount[] {
  const targets =
    scopeIds && scopeIds.length > 0 ? staticProvinces.filter((p) => scopeIds.includes(p.id)) : staticProvinces;
  const counts = new Map<string, number>();

  for (const h of hotspots) {
    const firePt = turf.point([h.lng, h.lat]);
    let nearestId: string | null = null;
    let nearestDist = Infinity;
    for (const p of targets) {
      const d = turf.distance(firePt, turf.point([p.lng, p.lat]), { units: 'kilometers' });
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = p.id;
      }
    }
    if (nearestId && nearestDist <= radiusKm) {
      counts.set(nearestId, (counts.get(nearestId) ?? 0) + 1);
    }
  }

  return targets
    .map((p) => ({ provinceId: p.id, name: p.name, fires: counts.get(p.id) ?? 0 }))
    .filter((c) => c.fires > 0)
    .sort((a, b) => b.fires - a.fires);
}

// ── World Bank forest area (live, key-free) ───────────────────────────────

export interface WorldBankForestResult {
  available: boolean;
  /** Most recent reported year. */
  latestYear?: number;
  /** Forest area in km² for latest year. */
  latestKm2?: number;
  /** Forest area as % of land (World Bank AG.LND.FRST.ZS-style derived). */
  series?: { year: number; km2: number }[];
  reason?: string;
}

interface WorldBankPoint {
  date: string;
  value: number | null;
}

/**
 * Vietnam forest area (km²) from the World Bank Open Data API
 * (indicator AG.LND.FRST.K2). No key required.
 */
export async function getVietnamForestArea(signal?: AbortSignal): Promise<WorldBankForestResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const url =
      'https://api.worldbank.org/v2/country/VNM/indicator/AG.LND.FRST.K2?format=json&per_page=80';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return { available: false, reason: `World Bank ${res.status}` };
    }
    const json = (await res.json()) as [unknown, WorldBankPoint[] | null];
    const points = Array.isArray(json) ? json[1] : null;
    if (!points || points.length === 0) {
      return { available: false, reason: 'World Bank returned no data' };
    }
    const series = points
      .filter((d) => d.value != null)
      .map((d) => ({ year: Number(d.date), km2: d.value as number }))
      .sort((a, b) => a.year - b.year);
    if (series.length === 0) return { available: false, reason: 'World Bank: empty series' };
    const latest = series[series.length - 1];
    return {
      available: true,
      latestYear: latest.year,
      latestKm2: latest.km2,
      series,
    };
  } catch (err) {
    return {
      available: false,
      reason: (err as Error)?.name === 'AbortError' ? 'World Bank timeout' : 'World Bank unreachable',
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
