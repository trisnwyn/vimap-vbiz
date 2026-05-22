import { NextRequest, NextResponse } from 'next/server';
import type { WeatherData } from '@/types/assessment';

/**
 * Open-Meteo proxy. Free, no API key. We pull climate-normal style values:
 *   - last 12 months daily aggregates → monthly rainfall + temp
 *   - ERA5 land surface soil moisture (0–7 cm) recent average
 *
 * Docs: https://open-meteo.com/en/docs/climate-api
 *       https://open-meteo.com/en/docs (forecast / historical)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latRaw = parseFloat(searchParams.get('lat') || '');
  const lngRaw = parseFloat(searchParams.get('lng') || '');
  if (!Number.isFinite(latRaw) || !Number.isFinite(lngRaw)) {
    return NextResponse.json({ error: 'lat/lng required' }, { status: 400 });
  }

  // Clamp to VN bounds for sanity
  const lat = Math.max(5, Math.min(26, latRaw));
  const lng = Math.max(98, Math.min(115, lngRaw));

  // Last 12 full months
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
  const start = new Date(end.getFullYear() - 1, end.getMonth() + 1, 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}` +
    `&start_date=${fmt(start)}&end_date=${fmt(end)}` +
    `&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration` +
    `&hourly=soil_moisture_0_to_7cm` +
    `&timezone=Asia%2FBangkok`;

  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      return NextResponse.json(
        { error: 'Open-Meteo error', detail: await r.text() },
        { status: 502 },
      );
    }
    const j = await r.json();
    const daily = j.daily;
    const hourly = j.hourly;
    if (!daily || !Array.isArray(daily.time)) {
      return NextResponse.json({ error: 'Unexpected Open-Meteo response' }, { status: 502 });
    }

    // Aggregate to monthly buckets
    const monthlyRain = new Array(12).fill(0);
    const monthlyTempSum = new Array(12).fill(0);
    const monthlyTempCount = new Array(12).fill(0);
    let tempSum = 0, tempCount = 0;
    let tempMin = Infinity, tempMax = -Infinity;
    let totalRain = 0;
    let etSum = 0, etCount = 0;
    let growingDays = 0;

    for (let i = 0; i < daily.time.length; i++) {
      const date = new Date(daily.time[i]);
      const m = date.getMonth();
      const t = daily.temperature_2m_mean?.[i];
      const tmin = daily.temperature_2m_min?.[i];
      const tmax = daily.temperature_2m_max?.[i];
      const p = daily.precipitation_sum?.[i];
      const et = daily.et0_fao_evapotranspiration?.[i];

      if (typeof t === 'number') {
        tempSum += t;
        tempCount++;
        monthlyTempSum[m] += t;
        monthlyTempCount[m]++;
        if (t > 10) growingDays++;
      }
      if (typeof tmin === 'number') tempMin = Math.min(tempMin, tmin);
      if (typeof tmax === 'number') tempMax = Math.max(tempMax, tmax);
      if (typeof p === 'number') { totalRain += p; monthlyRain[m] += p; }
      if (typeof et === 'number') { etSum += et; etCount++; }
    }

    // Soil moisture — average hourly across the window if available
    let smAvg = 0.28;
    if (hourly && Array.isArray(hourly.soil_moisture_0_to_7cm)) {
      const arr = hourly.soil_moisture_0_to_7cm.filter((v: number | null) => typeof v === 'number');
      if (arr.length > 0) {
        smAvg = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
      }
    }

    const data: WeatherData = {
      temperature: +(tempCount ? tempSum / tempCount : 25).toFixed(1),
      temperatureMin: Number.isFinite(tempMin) ? +tempMin.toFixed(1) : 20,
      temperatureMax: Number.isFinite(tempMax) ? +tempMax.toFixed(1) : 33,
      precipitation: Math.round(totalRain),
      soilMoisture: +smAvg.toFixed(3),
      evapotranspiration: etCount ? Math.round((etSum / etCount) * 365) : 1100,
      growingDays,
      monthlyRainfall: monthlyRain.map((v) => Math.round(v)),
      monthlyTemp: monthlyTempSum.map((v, i) =>
        +(monthlyTempCount[i] ? v / monthlyTempCount[i] : 0).toFixed(1),
      ),
    };

    return NextResponse.json({
      source: 'Open-Meteo (ERA5)',
      coordinates: { lat, lng },
      window: { start: fmt(start), end: fmt(end) },
      data,
    });
  } catch (err) {
    console.error('Open-Meteo fetch failed:', err);
    return NextResponse.json({ error: 'Failed to reach Open-Meteo' }, { status: 503 });
  }
}
