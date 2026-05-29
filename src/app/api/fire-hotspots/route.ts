import { NextRequest, NextResponse } from 'next/server';

// Vietnam bounding box: west,south,east,north
const VN_BBOX = '102.14,8.18,109.46,23.39';
// Use CSV endpoint — the JSON endpoint returns 400 on FIRMS's side
const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

const cache = new Map<string, { data: object; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/** Parse a single CSV line respecting quoted fields (handles commas inside quotes) */
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
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Parse FIRMS CSV response into structured hotspot objects */
function parseFirmsCsv(csv: string) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return {
      lat: parseFloat(row['latitude'] ?? row['lat'] ?? '0'),
      lng: parseFloat(row['longitude'] ?? row['lon'] ?? '0'),
      brightness: parseFloat(row['bright_ti4'] ?? row['brightness'] ?? '0'),
      date: row['acq_date'] ?? '',
      confidence: row['confidence'] ?? '',
      frp: parseFloat(row['frp'] ?? '0'),
    };
  }).filter(h => h.lat !== 0 && h.lng !== 0);
}

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

  const days = req.nextUrl.searchParams.get('days') || '2';
  const dayCount = Math.min(5, Math.max(1, parseInt(days) || 2));
  const source = req.nextUrl.searchParams.get('source') || 'VIIRS_SNPP_NRT';

  const cacheKey = `${source}:${dayCount}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, max-age=21600' },
    });
  }

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

    const csv = await response.text();
    const hotspots = parseFirmsCsv(csv);

    const result = {
      source: 'NASA FIRMS',
      satellite: source,
      bbox: VN_BBOX,
      days: dayCount,
      count: hotspots.length,
      hotspots,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

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
