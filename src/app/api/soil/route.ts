import { NextRequest, NextResponse } from 'next/server';
import type { SoilData } from '@/types/assessment';

/**
 * ISRIC SoilGrids REST proxy. Free, no API key.
 * Docs: https://rest.isric.org
 *
 * We request the 0–30 cm top-soil aggregated values (mean) for:
 *   phh2o, soc, nitrogen, cec, bdod, sand, silt, clay
 *
 * SoilGrids returns properties with applied conversion factors documented at
 * https://www.isric.org/explore/soilgrids/faq-soilgrids#What_do_the_filename_codes_mean.
 * We undo the scaling client-side here so the UI gets human-readable units.
 */

const PROPERTIES = ['phh2o', 'soc', 'nitrogen', 'cec', 'bdod', 'sand', 'silt', 'clay'] as const;
type PropName = (typeof PROPERTIES)[number];

// d_factor applied by SoilGrids (raw / d_factor = real value)
const DFACTORS: Record<PropName, number> = {
  phh2o: 10,
  soc: 10,      // dg/kg -> g/kg
  nitrogen: 100, // cg/kg -> g/kg
  cec: 10,      // mmol(c)/kg -> cmol/kg via /10
  bdod: 100,    // cg/cm³ -> kg/dm³
  sand: 10,     // g/kg -> %  (1000 -> 100)
  silt: 10,
  clay: 10,
};

function textureClass(sand: number, silt: number, clay: number): string {
  if (clay >= 40) return 'Clay';
  if (clay >= 27 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && silt < 28) return 'Sandy clay';
  if (silt >= 50 && clay >= 12) return 'Silty clay loam';
  if (silt >= 50) return 'Silt loam';
  if (sand >= 70 && clay < 15) return 'Sandy loam';
  if (sand >= 85) return 'Sand';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  return 'Loam';
}

function inferSoilName(textureClass: string, ph: number, soc: number): { type: string; description: string } {
  if (ph < 5.0 && soc < 15) return {
    type: 'Acrisol',
    description: 'Acidic, low-fertility soils common in Vietnam uplands; requires liming.',
  };
  if (ph < 5.5 && soc >= 15) return {
    type: 'Ferralsol (Red-Yellow)',
    description: 'Highly weathered tropical soil — typical of Central Highlands plantations.',
  };
  if (textureClass.includes('Clay') && ph >= 6.0) return {
    type: 'Vertisol / Heavy Clay',
    description: 'Clay-rich, swells & shrinks seasonally. Drainage works needed.',
  };
  if (textureClass.includes('Sand')) return {
    type: 'Arenosol',
    description: 'Sandy, low water retention; suited to drought-tolerant crops.',
  };
  if (ph >= 5.5 && ph <= 7.0) return {
    type: 'Fluvisol / Alluvial',
    description: 'Productive river-deposit soil typical of Vietnam deltas.',
  };
  return {
    type: 'Cambisol',
    description: 'Moderately developed tropical soil; broadly suitable for cultivation.',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set('lon', String(lng));
  params.set('lat', String(lat));
  PROPERTIES.forEach((p) => params.append('property', p));
  // 0-30 cm topsoil
  ['0-5cm', '5-15cm', '15-30cm'].forEach((d) => params.append('depth', d));
  params.append('value', 'mean');

  const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?${params.toString()}`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json(
        { error: 'SoilGrids error', detail: await r.text() },
        { status: 502 },
      );
    }
    const j = await r.json();

    // Average across the 3 depth layers for each property
    const values: Partial<Record<PropName, number>> = {};
    for (const layer of j.properties?.layers ?? []) {
      const name = layer.name as PropName;
      if (!PROPERTIES.includes(name)) continue;
      const depths = layer.depths ?? [];
      const means: number[] = [];
      for (const d of depths) {
        const m = d.values?.mean;
        if (typeof m === 'number') means.push(m / DFACTORS[name]);
      }
      if (means.length > 0) {
        values[name] = means.reduce((a, b) => a + b, 0) / means.length;
      }
    }

    // Fallbacks if SoilGrids has no data at this point
    const ph = values.phh2o ?? 5.5;
    const soc = values.soc ?? 14;
    const nitrogen = values.nitrogen ?? 1.2;
    const cec = values.cec ?? 12;
    const bd = values.bdod ?? 1.35;
    let sand = values.sand ?? 45;
    let silt = values.silt ?? 30;
    let clay = values.clay ?? 25;

    // Normalize to 100% in case rounding drift
    const tot = sand + silt + clay;
    if (tot > 0) {
      sand = (sand / tot) * 100;
      silt = (silt / tot) * 100;
      clay = (clay / tot) * 100;
    }

    const tc = textureClass(sand, silt, clay);
    const info = inferSoilName(tc, ph, soc);

    // Simple PTF estimates (Saxton & Rawls)
    const fc = +(0.18 + 0.0035 * clay + 0.001 * soc).toFixed(3);
    const wp = +(0.07 + 0.005 * clay - 0.001 * sand).toFixed(3);
    const aw = +Math.max(0.02, fc - wp).toFixed(3);

    const data: SoilData = {
      type: info.type,
      description: info.description,
      pH: +ph.toFixed(2),
      organicCarbon: +soc.toFixed(1),
      nitrogen: +nitrogen.toFixed(2),
      cec: +cec.toFixed(1),
      bulkDensity: +bd.toFixed(2),
      sand: +sand.toFixed(1),
      silt: +silt.toFixed(1),
      clay: +clay.toFixed(1),
      textureClass: tc,
      waterRetention: { fieldCapacity: fc, wiltingPoint: wp, availableWater: aw },
    };

    return NextResponse.json({
      source: 'ISRIC SoilGrids v2.0',
      coordinates: { lat, lng },
      data,
    });
  } catch (err) {
    console.error('SoilGrids fetch failed:', err);
    return NextResponse.json({ error: 'Failed to reach SoilGrids' }, { status: 503 });
  }
}
