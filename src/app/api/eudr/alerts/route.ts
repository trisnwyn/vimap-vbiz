// ─────────────────────────────────────────────────────────────────────────
// POST /api/eudr/alerts
//
// Query GFW Integrated Alerts (GLAD-L + GLAD-S2 + RADD) for a user-drawn
// polygon and return alert counts for the post-2020 EUDR compliance window.
//
// Falls back to the local `forestLossPoints` dataset when GFW_API_KEY is
// absent or the GFW API is unreachable — so the EUDR section always renders.
//
// Request body:
//   { "coordinates": [[lng, lat], ...] }   ← GeoJSON order, ≥3 points
//
// Response:
//   { available, alertCount, firstAlert, lastAlert, source }
// ─────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';
import { forestLossPoints } from '@/data/forest-loss';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// EUDR cutoff: deforestation after 31 Dec 2020 → non-compliant
const EUDR_CUTOFF_DATE = '2021-01-01';
const EUDR_CUTOFF_YEAR = 2020;

const GFW_BASE = 'https://data-api.globalforestwatch.org';
const GLAD_DATASET = 'gfw_integrated_alerts';

// Vietnam coordinate bounds for input validation
const VN_BOUNDS = { minLng: 98, maxLng: 115, minLat: 5, maxLat: 24 };

export interface GladAlertsResult {
  available: boolean;
  alertCount: number;
  firstAlert: string | null;
  lastAlert: string | null;
  /** Where the data came from. */
  source: 'gfw_integrated_alerts' | 'local_fallback' | 'none';
  reason?: string;
}

export async function POST(req: NextRequest): Promise<Response> {
  // ── rate-limit: 20 plot checks / min / IP ──
  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:eudr`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  // ── parse + validate body ──
  let body: { coordinates?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.coordinates) || body.coordinates.length < 3) {
    return NextResponse.json(
      { error: 'coordinates must be an array of at least 3 [lng, lat] pairs' },
      { status: 400 },
    );
  }

  const coords = body.coordinates as unknown[];
  const validated: [number, number][] = [];

  for (const pt of coords) {
    if (
      !Array.isArray(pt) ||
      pt.length < 2 ||
      typeof pt[0] !== 'number' ||
      typeof pt[1] !== 'number'
    ) {
      return NextResponse.json({ error: 'Each coordinate must be [lng, lat]' }, { status: 400 });
    }
    const [lng, lat] = pt as [number, number];
    if (lng < VN_BOUNDS.minLng || lng > VN_BOUNDS.maxLng || lat < VN_BOUNDS.minLat || lat > VN_BOUNDS.maxLat) {
      return NextResponse.json({ error: 'Coordinates outside Vietnam bounds' }, { status: 400 });
    }
    validated.push([lng, lat]);
  }

  const apiKey = process.env.GFW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(localFallback(validated));
  }

  // ── GFW Integrated Alerts query ──
  const closed = [...validated, validated[0]];
  const geometry = { type: 'Polygon', coordinates: [closed] };

  const sql =
    `SELECT COUNT(*) AS alert_count, MIN(alert__date) AS first_alert, MAX(alert__date) AS last_alert ` +
    `FROM data WHERE alert__date >= '${EUDR_CUTOFF_DATE}'`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch(`${GFW_BASE}/dataset/${GLAD_DATASET}/latest/query`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, geometry }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[eudr/alerts] GFW API ${res.status} — falling back to local`);
      return NextResponse.json(localFallback(validated));
    }

    const json = await res.json() as { data?: { alert_count: number; first_alert: string | null; last_alert: string | null }[] };
    const row = json.data?.[0];

    const result: GladAlertsResult = {
      available: true,
      alertCount: row?.alert_count ?? 0,
      firstAlert: row?.first_alert ?? null,
      lastAlert: row?.last_alert ?? null,
      source: 'gfw_integrated_alerts',
    };
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[eudr/alerts] GFW fetch failed (${msg}) — falling back to local`);
    return NextResponse.json(localFallback(validated));
  }
}

// ── Local fallback using hardcoded forest-loss points ─────────────────────

function localFallback(coords: [number, number][]): GladAlertsResult {
  try {
    const closed = [...coords, coords[0]];
    const polygon = turf.polygon([closed]);
    const count = forestLossPoints.filter((p) => {
      if (p.year <= EUDR_CUTOFF_YEAR) return false;
      return turf.booleanPointInPolygon(turf.point([p.lng, p.lat]), polygon);
    }).length;
    return { available: true, alertCount: count, firstAlert: null, lastAlert: null, source: 'local_fallback' };
  } catch {
    return { available: false, alertCount: 0, firstAlert: null, lastAlert: null, source: 'none', reason: 'Spatial computation failed' };
  }
}
