import { NextRequest, NextResponse } from 'next/server';

const GFW_BASE = 'https://data-api.globalforestwatch.org';

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

  const iso = req.nextUrl.searchParams.get('iso') || 'VNM';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      `${GFW_BASE}/dataset/umd_tree_cover_loss/latest/query?sql=SELECT+iso,+umd_tree_cover_loss__year,+SUM(area__ha)+as+area_ha+FROM+results+WHERE+iso='${encodeURIComponent(iso)}'+GROUP+BY+iso,+umd_tree_cover_loss__year+ORDER+BY+umd_tree_cover_loss__year`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error('GFW API error:', response.status, err);
      return NextResponse.json(
        { error: 'GFW API request failed', status: response.status, fallback: true },
        { status: 502 },
      );
    }

    const result = await response.json();

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
