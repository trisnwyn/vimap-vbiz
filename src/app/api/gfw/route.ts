import { NextRequest, NextResponse } from 'next/server';

// Dataset: umd_adm1_net_tree_cover_change_from_height (2000–2020, province level)
// Columns: gid_0 (ISO3), name_1 (province), loss, gain, net, extent_00 (2000 extent ha)
const GFW_BASE = 'https://data-api.globalforestwatch.org';
const DATASET = 'umd_adm1_net_tree_cover_change_from_height';

let cache: { data: object; timestamp: number } | null = null;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week

export async function GET(req: NextRequest) {
  const apiKey = process.env.GFW_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'GFW_API_KEY not configured',
        hint: 'Sign up at globalforestwatch.org and add GFW_API_KEY to .env.local',
        fallback: true,
      },
      { status: 503 },
    );
  }

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, max-age=604800' },
    });
  }

  const iso = (req.nextUrl.searchParams.get('iso') || 'VNM').toUpperCase();
  const sql = `SELECT gid_0, name_1, loss, gain, net, extent_00 FROM data WHERE gid_0 = '${iso}' ORDER BY loss DESC`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      `${GFW_BASE}/dataset/${DATASET}/latest/query?sql=${encodeURIComponent(sql)}`,
      {
        headers: { 'x-api-key': apiKey },
        redirect: 'follow',
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error('GFW API error:', response.status, err);
      return NextResponse.json(
        { error: 'GFW API request failed', status: response.status, detail: err, fallback: true },
        { status: 502 },
      );
    }

    const json = await response.json();
    const provinces: { name: string; loss_ha: number; gain_ha: number; net_ha: number; extent_2000_ha: number }[] =
      (json.data ?? []).map((r: { name_1: string; loss: number; gain: number; net: number; extent_00: number }) => ({
        name: r.name_1,
        loss_ha: Math.round((r.loss ?? 0) * 100) / 100,
        gain_ha: Math.round((r.gain ?? 0) * 100) / 100,
        net_ha: Math.round((r.net ?? 0) * 100) / 100,
        extent_2000_ha: Math.round((r.extent_00 ?? 0) * 100) / 100,
      }));

    const result = {
      source: 'Global Forest Watch / UMD',
      dataset: DATASET,
      period: '2000–2020',
      iso,
      count: provinces.length,
      provinces,
    };

    cache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=604800' },
    });
  } catch (err) {
    console.error('GFW fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to reach GFW API', fallback: true },
      { status: 503 },
    );
  }
}
