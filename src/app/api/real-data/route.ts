import { NextResponse } from 'next/server';

// Fetch real Vietnam forest area data from World Bank Open Data API
// Indicator: AG.LND.FRST.K2 (Forest area in sq. km)
export async function GET() {
  try {
    const response = await fetch(
      'https://api.worldbank.org/v2/country/VNM/indicator/AG.LND.FRST.K2?format=json&date=2000:2022&per_page=50',
      { next: { revalidate: 86400 } }, // Cache for 24h
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'World Bank API error' }, { status: 502 });
    }

    const raw = await response.json();
    // World Bank returns [metadata, data_array]
    const entries = raw[1] ?? [];

    const data = entries
      .filter((e: { value: number | null }) => e.value !== null)
      .map((e: { date: string; value: number }) => ({
        year: parseInt(e.date),
        forestAreaKm2: e.value,
        forestAreaHa: Math.round(e.value * 100), // Convert km² to hectares
      }))
      .sort((a: { year: number }, b: { year: number }) => a.year - b.year);

    return NextResponse.json({
      source: 'World Bank Open Data',
      indicator: 'AG.LND.FRST.K2',
      description: 'Forest area (sq. km) — Vietnam',
      lastUpdated: new Date().toISOString(),
      data,
    });
  } catch (err) {
    console.error('World Bank API fetch failed:', err);
    return NextResponse.json({ error: 'Failed to fetch real data' }, { status: 503 });
  }
}
