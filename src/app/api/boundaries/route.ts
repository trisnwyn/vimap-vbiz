import { NextResponse } from 'next/server';

// Fetch Vietnam province boundaries from public GeoJSON sources
const GEOJSON_SOURCES = [
  'https://raw.githubusercontent.com/nguyenngoclong/vietnam-gis/master/province/diaphantinhvn.geojson',
  'https://raw.githubusercontent.com/TungTh/vnmese-provinces-geojson/master/vietnam-provinces.json',
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
];

let cachedGeoJSON: { data: object; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  // Return cached version if still valid
  if (cachedGeoJSON && Date.now() - cachedGeoJSON.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedGeoJSON.data, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    });
  }

  for (const url of GEOJSON_SOURCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, {
        next: { revalidate: 86400 * 7 },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) continue;

      const geojson = await response.json();

      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        // First two sources are Vietnam-only province files — accept all features.
        // The country-level fallback contains every country — filter to Vietnam only.
        const isCountrySource = url.includes('geo-countries');
        const features = geojson.features.filter((f: {
          properties?: Record<string, unknown>;
        }) => {
          if (!isCountrySource) return true;
          const props = f.properties ?? {};
          return (
            props['ISO3166-1-Alpha-3'] === 'VNM' ||
            props['ISO3166-1-Alpha-2'] === 'VN' ||
            props.name === 'Vietnam' ||
            props.NAME_0 === 'Vietnam' ||
            props.admin === 'Vietnam'
          );
        });

        // Simplify properties to reduce payload
        const simplified = {
          type: 'FeatureCollection',
          features: features.map((f: {
            type: string;
            geometry: object;
            properties: Record<string, unknown>;
          }) => ({
            type: f.type,
            geometry: f.geometry,
            properties: {
              name: f.properties.Name || f.properties.name || f.properties.NAME_1 || f.properties.ten_tinh || '',
              id: f.properties.Ma || f.properties.id || f.properties.GID_1 || '',
            },
          })),
        };

        cachedGeoJSON = { data: simplified, timestamp: Date.now() };

        return NextResponse.json(simplified, {
          headers: {
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    } catch (err) {
      console.error(`Failed to fetch from ${url}:`, err);
      continue;
    }
  }

  return NextResponse.json(
    { error: 'Could not fetch province boundaries from any source' },
    { status: 503 },
  );
}
