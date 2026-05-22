import { NextRequest, NextResponse } from 'next/server';

// Vietnam bounding box: west,south,east,north
const VN_BBOX = '102.14,8.18,109.46,23.39';
const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/json';

let cache: { data: object; timestamp: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function GET(req: NextRequest) {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) {
    return NextResponse.json(
      {
        error: 'FIRMS_MAP_KEY not configured',
        hint: 'Sign up at firms.modaps.eosdis.nasa.gov/api/map_key/ and add FIRMS_MAP_KEY to .env.local',
        fallback: true,
      },
      { status: 503 },
    );
  }

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data, {
      headers: { 'Cache-Control': 'public, max-age=21600' },
    });
  }

  const days = req.nextUrl.searchParams.get('days') || '2';
  const dayCount = Math.min(5, Math.max(1, parseInt(days) || 2));
  const source = req.nextUrl.searchParams.get('source') || 'VIIRS_SNPP_NRT';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const url = `${FIRMS_BASE}/${mapKey}/${source}/${VN_BBOX}/${dayCount}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      console.error('FIRMS API error:', response.status, err);
      return NextResponse.json(
        { error: 'FIRMS API request failed', status: response.status, fallback: true },
        { status: 502 },
      );
    }

    const hotspots = await response.json();

    const result = {
      source: 'NASA FIRMS',
      satellite: source,
      bbox: VN_BBOX,
      days: dayCount,
      count: Array.isArray(hotspots) ? hotspots.length : 0,
      hotspots: Array.isArray(hotspots)
        ? hotspots.map((h: { latitude: number; longitude: number; brightness: number; acq_date: string; confidence: string }) => ({
            lat: h.latitude,
            lng: h.longitude,
            brightness: h.brightness,
            date: h.acq_date,
            confidence: h.confidence,
          }))
        : [],
    };

    cache = { data: result, timestamp: Date.now() };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=21600' },
    });
  } catch (err) {
    console.error('FIRMS fetch failed:', err);
    return NextResponse.json(
      { error: 'Failed to reach FIRMS API', fallback: true },
      { status: 503 },
    );
  }
}
