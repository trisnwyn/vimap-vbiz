// ─────────────────────────────────────────────────────────────────────────
// POST /api/forecast/pulse  →  cheap live snapshot (NO LLM)
//
// The always-live "pulse" that powers the auto-updating forecast band. It
// composes existing deterministic + live data tools (no web search, no LLM
// synthesis) so it is safe to poll continuously from the client without
// burning AI quota:
//   • getForecastSummary  — pure 2030 projection (synchronous)
//   • getNationalSummary  — aggregate forest stats for the user's scope
//   • getTopRiskProvinces — highest loss-rate provinces in scope
//   • getActiveFires      — live NASA FIRMS hotspots (degrades gracefully)
//
// Server-cached ~3 min, module-level Map keyed by scope+year (mirrors the
// fire-hotspots / news cache pattern). Only non-empty results are cached.
// ─────────────────────────────────────────────────────────────────────────

import { getClientIp, rateLimit } from '@/lib/rate-limit';
import {
  getNationalSummary,
  getTopRiskProvinces,
  getActiveFires,
  bucketFiresToProvinces,
  type NationalSummary,
  type ProvinceStat,
} from '@/lib/intel/tools';
import { getForecastSummary, computeRiskScore, type ForecastSummary } from '@/lib/intel/forecast';
import type { BusinessProfile, Language } from '@/types/intel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLES = new Set(['exporter', 'importer', 'roaster', 'trader', 'manufacturer', 'financier', 'ngo', 'other']);
const LANGS = new Set<Language>(['en', 'vi']);

// ── server cache: 3 min, keyed by scope+year ──
const cache = new Map<string, { data: ForecastPulse; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 min

export interface ForecastPulseRisk {
  id: string;
  name: string;
  score: number;
  lossRatePct: string;
}

export interface ForecastPulse {
  generatedAt: number;
  year: number;
  scope: 'national' | 'province';
  forecast: ForecastSummary;
  national: NationalSummary;
  topRisks: ForecastPulseRisk[];
  fires: {
    available: boolean;
    count: number;
    top: { provinceId: string; name: string; fires: number }[];
  };
}

/** Coerce arbitrary JSON into a safe BusinessProfile (defensive). */
function sanitizeProfile(input: unknown): BusinessProfile | null {
  if (!input || typeof input !== 'object') return null;
  const p = input as Record<string, unknown>;
  if (typeof p.role !== 'string' || !ROLES.has(p.role)) return null;

  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 30) : [];

  return {
    companyName: typeof p.companyName === 'string' ? p.companyName.slice(0, 120) : undefined,
    role: p.role as BusinessProfile['role'],
    commodities: strArr(p.commodities) as BusinessProfile['commodities'],
    sourcingProvinces: strArr(p.sourcingProvinces),
    markets: strArr(p.markets) as BusinessProfile['markets'],
    concerns: strArr(p.concerns) as BusinessProfile['concerns'],
    language: typeof p.language === 'string' && LANGS.has(p.language as Language) ? (p.language as Language) : 'en',
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
  };
}

export async function POST(req: Request): Promise<Response> {
  // ── parse body ──
  let body: { profile?: unknown; year?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const profile = sanitizeProfile(body.profile);
  if (!profile) {
    return Response.json({ error: 'Missing or invalid business profile' }, { status: 400 });
  }

  const year =
    typeof body.year === 'number' && body.year >= 2000 && body.year <= 2030
      ? body.year
      : new Date().getFullYear();

  // ── rate-limit: 30 pulses / min / IP (cheap, polled frequently) ──
  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:pulse`, 30, 60_000);
  if (!rl.success) {
    return Response.json(
      { error: 'Too many pulse requests.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      },
    );
  }

  const scopeIds = profile.sourcingProvinces.length > 0 ? profile.sourcingProvinces : undefined;
  const cacheKey = `${(scopeIds ?? ['*']).join(',')}|${year}`;

  // ── serve from cache when fresh ──
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL) {
    return Response.json(hit.data, {
      headers: { 'Cache-Control': 'private, max-age=180', 'X-Cache': 'HIT' },
    });
  }

  // ── compose deterministic + live data in parallel ──
  // getForecastSummary is pure/sync; the rest are async. getActiveFires never
  // throws (returns available:false), so the whole pulse degrades gracefully.
  const forecast = getForecastSummary(year, null);

  const [national, topRiskStats, fires] = await Promise.all([
    getNationalSummary(year, scopeIds),
    getTopRiskProvinces(year, 6, scopeIds),
    getActiveFires(2, req.signal),
  ]);

  const topRisks: ForecastPulseRisk[] = topRiskStats.map((s: ProvinceStat) => ({
    id: s.id,
    name: s.name,
    score: computeRiskScore(s.id, year),
    lossRatePct: s.lossRatePct,
  }));

  const fireTop = fires.available ? bucketFiresToProvinces(fires.hotspots, scopeIds).slice(0, 5) : [];

  const pulse: ForecastPulse = {
    generatedAt: Date.now(),
    year,
    scope: scopeIds ? 'province' : 'national',
    forecast,
    national,
    topRisks,
    fires: { available: fires.available, count: fires.count, top: fireTop },
  };

  // Only cache complete results (national summary should always have provinces).
  if (national.provinceCount > 0) {
    cache.set(cacheKey, { data: pulse, timestamp: Date.now() });
  }

  return Response.json(pulse, {
    headers: { 'Cache-Control': 'private, max-age=180', 'X-Cache': 'MISS' },
  });
}
