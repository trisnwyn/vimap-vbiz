// ─────────────────────────────────────────────────────────────────────────
// Province data hydration — GFW Hansen / UMD dataset.
//
// On first call this module fetches live provincial forest statistics from
// the Global Forest Watch Data API and scales the static province timeseries
// to match the real GFW 2000 baseline extent. Results are cached for the
// lifetime of the server process (no re-fetch on every request).
//
// Falls back to static data silently when:
//   - GFW_API_KEY is not configured
//   - The GFW API is unreachable or returns an error
//   - A province cannot be matched by name
//
// Client-side components still import from @/data/provinces directly —
// this module is server-side only.
// ─────────────────────────────────────────────────────────────────────────

import { provinces as staticProvinces } from '@/data/provinces';
import type { Province } from '@/types';

// ── Module-level cache ────────────────────────────────────────────────────

let _cache: Province[] | null = null;
let _pending: Promise<Province[]> | null = null;

/**
 * Returns province data enriched with live GFW numbers when GFW_API_KEY is
 * set. Falls back to static data silently. Cached per server process.
 */
export async function getHydratedProvinces(): Promise<Province[]> {
  if (_cache) return _cache;
  if (_pending) return _pending;
  _pending = _hydrate().then((p) => {
    _cache = p;
    return p;
  });
  return _pending;
}

// ── Name normalizer ───────────────────────────────────────────────────────

/** Strip diacritics, lowercase, collapse whitespace — for fuzzy name matching. */
function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── GFW fetch + merge ─────────────────────────────────────────────────────

interface GfwRow {
  name_1: string;
  loss: number;
  gain: number;
  net: number;
  extent_00: number; // forest extent in 2000 (ha)
}

const GFW_BASE = 'https://data-api.globalforestwatch.org';
const DATASET = 'umd_adm1_net_tree_cover_change_from_height';

async function _hydrate(): Promise<Province[]> {
  const apiKey = process.env.GFW_API_KEY;
  if (!apiKey) {
    console.log('[province-hydration] No GFW_API_KEY — using static province data');
    return staticProvinces;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const sql = `SELECT name_1, loss, gain, net, extent_00 FROM data WHERE gid_0 = 'VNM'`;
    const res = await fetch(
      `${GFW_BASE}/dataset/${DATASET}/latest/query?sql=${encodeURIComponent(sql)}`,
      { headers: { 'x-api-key': apiKey }, signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[province-hydration] GFW API returned ${res.status} — using static data`);
      return staticProvinces;
    }

    const json = (await res.json()) as { data?: GfwRow[] };
    const rows = json.data ?? [];

    if (rows.length === 0) {
      console.warn('[province-hydration] GFW returned 0 rows — using static data');
      return staticProvinces;
    }

    // Build lookup: normalized name → row
    const byNorm = new Map<string, GfwRow>();
    for (const row of rows) {
      byNorm.set(normName(row.name_1), row);
    }

    let matched = 0;
    let scaled = 0;

    const merged = staticProvinces.map((p): Province => {
      // 1. Exact match on English name
      // 2. Exact match on Vietnamese name
      // 3. Substring match (catches "Ho Chi Minh City" ↔ "Ho Chi Minh")
      const nEn = normName(p.name);
      const nVi = normName(p.nameVi);

      let gfw = byNorm.get(nEn) ?? byNorm.get(nVi);

      if (!gfw) {
        for (const [key, row] of byNorm) {
          if (nEn.includes(key) || key.includes(nEn) || nVi.includes(key) || key.includes(nVi)) {
            gfw = row;
            break;
          }
        }
      }

      if (!gfw || !gfw.extent_00 || gfw.extent_00 <= 0) return p;
      matched++;

      const realBase = Math.round(gfw.extent_00);
      const staticBase = p.forestCover[2000] ?? realBase;

      // Skip scaling if within 5% — difference is within calibration noise
      if (Math.abs(realBase - staticBase) / staticBase < 0.05) return p;
      scaled++;

      // Scale all cover + loss checkpoints proportionally.
      // lossRate = loss/cover, so it stays unchanged when both scale equally.
      const ratio = realBase / staticBase;

      const scaledCover = Object.fromEntries(
        Object.entries(p.forestCover).map(([yr, ha]) => [Number(yr), Math.round((ha as number) * ratio)]),
      ) as Province['forestCover'];

      const scaledLoss = Object.fromEntries(
        Object.entries(p.forestLoss).map(([yr, ha]) => [Number(yr), Math.round((ha as number) * ratio)]),
      ) as Province['forestLoss'];

      return { ...p, forestCover: scaledCover, forestLoss: scaledLoss };
    });

    console.log(
      `[province-hydration] GFW hydration complete: ${matched}/${staticProvinces.length} provinces matched, ${scaled} rescaled`,
    );
    return merged;
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[province-hydration] Hydration failed (${msg}) — using static data`);
    return staticProvinces;
  }
}
