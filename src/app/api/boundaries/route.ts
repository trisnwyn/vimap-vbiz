import { NextResponse } from 'next/server';

// Fetch Vietnam province boundaries from public GeoJSON sources
const GEOJSON_SOURCES = [
  'https://raw.githubusercontent.com/nguyenngoclong/vietnam-gis/master/province/diaphantinhvn.geojson',
  'https://raw.githubusercontent.com/TungTh/vnmese-provinces-geojson/master/vietnam-provinces.json',
];

let cachedGeoJSON: object | null = null;

export async function GET() {
  // Return cached version if available
  if (cachedGeoJSON) {
    return NextResponse.json(cachedGeoJSON);
  }

  for (const url of GEOJSON_SOURCES) {
    try {
      const response = await fetch(url, { next: { revalidate: 86400 * 7 } });
      if (!response.ok) continue;

      const geojson = await response.json();

      // Validate it's a proper GeoJSON
      if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
        // Simplify properties to reduce payload
        const simplified = {
          type: 'FeatureCollection',
          features: geojson.features.map((f: {
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

        cachedGeoJSON = simplified;

        return NextResponse.json(simplified, {
          headers: {
            'Cache-Control': 'public, max-age=604800, immutable',
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
