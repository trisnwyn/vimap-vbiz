import * as turf from '@turf/turf';
import { provinces } from '@/data/provinces';
import { forestLossPoints } from '@/data/forest-loss';
import { interpolateYear } from '@/data/utils';
import type {
  WeatherData,
  SoilData,
  SuitabilityScores,
  CropRecommendation,
  LandAssessment,
  NearestPort,
} from '@/types/assessment';
import type { Province } from '@/types';

/* --------------------------------------------------------------------------
 * Major Vietnamese export ports — used for market-access scoring.
 * -------------------------------------------------------------------------- */
export const PORTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Hai Phong Port', lat: 20.86, lng: 106.72 },
  { name: 'Da Nang Port', lat: 16.07, lng: 108.22 },
  { name: 'Ho Chi Minh City Port', lat: 10.76, lng: 106.74 },
  { name: 'Cai Mep Port', lat: 10.51, lng: 107.03 },
];

export function nearestPort(lat: number, lng: number): NearestPort {
  const me = turf.point([lng, lat]);
  let best = PORTS[0];
  let bestKm = Infinity;
  for (const p of PORTS) {
    const km = turf.distance(me, turf.point([p.lng, p.lat]), { units: 'kilometers' });
    if (km < bestKm) {
      bestKm = km;
      best = p;
    }
  }
  return { name: best.name, distanceKm: Math.round(bestKm) };
}

export function nearestProvince(lat: number, lng: number): Province {
  const me = turf.point([lng, lat]);
  return provinces.reduce((best, p) => {
    const d = turf.distance(me, turf.point([p.lng, p.lat]), { units: 'kilometers' });
    const dBest = turf.distance(me, turf.point([best.lng, best.lat]), { units: 'kilometers' });
    return d < dBest ? p : best;
  }, provinces[0]);
}

/* --------------------------------------------------------------------------
 * Suitability scoring — each returns 0..100.
 * -------------------------------------------------------------------------- */

// Soil quality from ISRIC SoilGrids data.
export function scoreSoil(soil: SoilData | null): number {
  if (!soil) return 50;

  // pH curve: optimum 5.5–7.0
  const phPenalty =
    soil.pH < 4.5 ? 35 :
    soil.pH < 5.0 ? 20 :
    soil.pH < 5.5 ? 10 :
    soil.pH <= 7.0 ? 0 :
    soil.pH <= 7.5 ? 10 :
    soil.pH <= 8.0 ? 20 : 30;

  // Organic carbon (g/kg) — higher is better, 30+ is excellent
  const oc = Math.min(30, Math.max(0, soil.organicCarbon));
  const ocScore = (oc / 30) * 30; // 0..30

  // CEC (cmol/kg) — higher = better nutrient holding, 25+ excellent
  const cec = Math.min(25, Math.max(0, soil.cec));
  const cecScore = (cec / 25) * 20; // 0..20

  // Available water capacity (mm/m) — proxy via fc - wp; 100+ excellent
  const aw = Math.max(0, soil.waterRetention.availableWater);
  const awScore = Math.min(20, (aw / 0.2) * 20); // assuming 0..0.2 cm³/cm³

  // Texture penalty — sandy or very clayey is worse
  const sand = soil.sand;
  const clay = soil.clay;
  let texturePenalty = 0;
  if (sand > 70) texturePenalty = 12;
  else if (clay > 60) texturePenalty = 10;
  else if (sand > 55) texturePenalty = 5;

  const base = 100 - phPenalty - texturePenalty;
  const score = base * 0.5 + ocScore + cecScore + awScore;
  return clamp01to100(score);
}

// Water access from rainfall + soil moisture.
export function scoreWater(weather: WeatherData | null): number {
  if (!weather) return 50;

  // Optimum rainfall: 1500–2500 mm/yr
  const r = weather.precipitation;
  let rainScore: number;
  if (r < 600) rainScore = 10;
  else if (r < 1000) rainScore = 35 + ((r - 600) / 400) * 30;        // 35..65
  else if (r < 1500) rainScore = 65 + ((r - 1000) / 500) * 25;       // 65..90
  else if (r <= 2500) rainScore = 100;
  else if (r <= 3500) rainScore = 100 - ((r - 2500) / 1000) * 15;    // 100..85
  else rainScore = 70;

  // Soil moisture (volumetric, 0–1)
  const sm = weather.soilMoisture;
  const smScore = sm < 0.1 ? 20 : sm < 0.2 ? 60 : sm < 0.4 ? 95 : 85;

  // Dry-month penalty: count months below 50 mm
  const dryMonths = weather.monthlyRainfall.filter((m) => m < 50).length;
  const dryPenalty = dryMonths * 4; // up to 48

  const score = (rainScore * 0.6 + smScore * 0.4) - dryPenalty;
  return clamp01to100(score);
}

// Climate score: growing days + temperature stability.
export function scoreClimate(weather: WeatherData | null): number {
  if (!weather) return 50;

  // Growing days 250+ is excellent for VN tropical context
  const gd = Math.min(365, weather.growingDays);
  const gdScore = (gd / 365) * 60; // 0..60

  // Temperature range — too cold or too hot is bad
  const mean = weather.temperature;
  const meanScore =
    mean < 15 ? 30 :
    mean < 20 ? 60 :
    mean <= 28 ? 100 :
    mean <= 32 ? 75 : 45;

  // Diurnal stability — extreme highs lower score
  const stress = Math.max(0, weather.temperatureMax - 38) * 3;

  const score = gdScore + meanScore * 0.4 - stress;
  return clamp01to100(score);
}

// Market access — distance to nearest port, road proximity proxy via province.
export function scoreMarketAccess(port: NearestPort, province: Province): number {
  // Distance curve
  const d = port.distanceKm;
  let distScore: number;
  if (d < 50) distScore = 100;
  else if (d < 150) distScore = 100 - ((d - 50) / 100) * 25;     // 100..75
  else if (d < 300) distScore = 75 - ((d - 150) / 150) * 25;     // 75..50
  else if (d < 500) distScore = 50 - ((d - 300) / 200) * 25;     // 50..25
  else distScore = 25;

  // Region bonus — delta regions & Southeast have better logistics
  const regionBonus: Record<string, number> = {
    'Red River Delta': 10,
    'Southeast': 10,
    'Mekong Delta': 8,
    'South Central': 4,
    'North Central': 2,
    'Central Highlands': -5,
    'Northwest': -10,
    'Northeast': -5,
  };
  const bonus = regionBonus[province.region] ?? 0;

  return clamp01to100(distScore + bonus);
}

// Regulatory safety — EUDR & deforestation risk inverse.
export function scoreRegulatory(
  province: Province,
  postCutoffLossCount: number,
  isEUDRCrop: boolean,
): number {
  let score = 100;

  const rate2024 = province.lossRate[2024] ?? 0;
  score -= Math.min(50, rate2024 * 1500); // up to -50 for high loss

  if (postCutoffLossCount > 0) score -= Math.min(30, postCutoffLossCount * 6);
  if (isEUDRCrop && rate2024 > 0.01) score -= 10;

  if (province.region === 'Central Highlands') score -= 8;
  if (province.region === 'Southeast') score -= 5;

  return clamp01to100(score);
}

// Vegetation health — derived from province forest cover trend.
export function scoreVegetation(province: Province): number {
  const fc2000 = province.forestCover[2000] ?? 0;
  const fc2024 = province.forestCover[2024] ?? 0;
  if (fc2000 <= 0) return 50;
  const changePct = ((fc2024 - fc2000) / fc2000) * 100;
  // -50% change → ~20; 0% → ~60; +30% → ~90
  const score = 60 + changePct * 0.7;
  return clamp01to100(score);
}

/* --------------------------------------------------------------------------
 * Composite investment score.
 * -------------------------------------------------------------------------- */
const WEIGHTS = {
  soilQuality: 0.20,
  waterAccess: 0.18,
  climate: 0.18,
  marketAccess: 0.15,
  regulatorySafety: 0.17,
  vegetationHealth: 0.12,
} as const;

export function compositeScore(s: SuitabilityScores): number {
  return clamp01to100(
    s.soilQuality * WEIGHTS.soilQuality +
    s.waterAccess * WEIGHTS.waterAccess +
    s.climate * WEIGHTS.climate +
    s.marketAccess * WEIGHTS.marketAccess +
    s.regulatorySafety * WEIGHTS.regulatorySafety +
    s.vegetationHealth * WEIGHTS.vegetationHealth,
  );
}

export function scoreToRating(score: number): LandAssessment['rating'] {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 50) return 'moderate';
  if (score >= 35) return 'poor';
  return 'unsuitable';
}

/* --------------------------------------------------------------------------
 * Crop recommendations.
 * -------------------------------------------------------------------------- */

interface CropProfile {
  name: string;
  nameVi: string;
  // Preferred ranges
  rainfall: [number, number];   // mm/yr
  tempMean: [number, number];   // °C
  phRange: [number, number];
  preferRegions?: string[];
  demand: 'high' | 'medium' | 'low';
  yield: string;
}

const CROP_PROFILES: CropProfile[] = [
  {
    name: 'Coffee (Robusta)',
    nameVi: 'Cà phê Robusta',
    rainfall: [1500, 2500], tempMean: [22, 28], phRange: [5.0, 6.5],
    preferRegions: ['Central Highlands', 'South Central'],
    demand: 'high', yield: '2.5–3.5 t/ha',
  },
  {
    name: 'Rubber',
    nameVi: 'Cao su',
    rainfall: [1800, 3000], tempMean: [24, 30], phRange: [4.5, 6.5],
    preferRegions: ['Southeast', 'Central Highlands', 'North Central'],
    demand: 'medium', yield: '1.5–2.2 t/ha',
  },
  {
    name: 'Rice (Paddy)',
    nameVi: 'Lúa',
    rainfall: [1200, 2500], tempMean: [22, 32], phRange: [5.5, 7.0],
    preferRegions: ['Mekong Delta', 'Red River Delta'],
    demand: 'high', yield: '5–7 t/ha',
  },
  {
    name: 'Cassava',
    nameVi: 'Sắn',
    rainfall: [800, 2000], tempMean: [22, 30], phRange: [4.5, 7.0],
    demand: 'medium', yield: '20–30 t/ha',
  },
  {
    name: 'Maize',
    nameVi: 'Ngô',
    rainfall: [600, 1500], tempMean: [20, 30], phRange: [5.5, 7.5],
    preferRegions: ['Northwest', 'Northeast'],
    demand: 'medium', yield: '4–6 t/ha',
  },
  {
    name: 'Tea',
    nameVi: 'Chè',
    rainfall: [1500, 2500], tempMean: [18, 25], phRange: [4.5, 6.0],
    preferRegions: ['Northeast', 'Northwest'],
    demand: 'medium', yield: '1.5–2.5 t/ha (dry leaf)',
  },
  {
    name: 'Cashew',
    nameVi: 'Điều',
    rainfall: [800, 2000], tempMean: [24, 32], phRange: [5.5, 7.5],
    preferRegions: ['Southeast', 'South Central'],
    demand: 'high', yield: '1.2–2.0 t/ha',
  },
  {
    name: 'Pepper',
    nameVi: 'Hồ tiêu',
    rainfall: [1500, 2500], tempMean: [22, 28], phRange: [5.0, 6.5],
    preferRegions: ['Central Highlands', 'Southeast'],
    demand: 'high', yield: '2.5–4.0 t/ha',
  },
  {
    name: 'Mango',
    nameVi: 'Xoài',
    rainfall: [800, 2000], tempMean: [24, 32], phRange: [5.5, 7.5],
    preferRegions: ['Mekong Delta', 'South Central'],
    demand: 'medium', yield: '8–15 t/ha',
  },
  {
    name: 'Dragon Fruit',
    nameVi: 'Thanh long',
    rainfall: [600, 1800], tempMean: [22, 32], phRange: [5.5, 7.5],
    preferRegions: ['South Central', 'Southeast'],
    demand: 'high', yield: '20–30 t/ha',
  },
  {
    name: 'Acacia (Timber)',
    nameVi: 'Keo (gỗ)',
    rainfall: [1000, 2500], tempMean: [20, 30], phRange: [4.5, 6.5],
    preferRegions: ['North Central', 'South Central', 'Northeast'],
    demand: 'medium', yield: '15–20 m³/ha/yr',
  },
];

function rangeFit(value: number, [lo, hi]: [number, number]): number {
  if (value >= lo && value <= hi) return 1.0;
  const dist = value < lo ? (lo - value) / lo : (value - hi) / hi;
  return Math.max(0, 1 - dist * 2);
}

export function recommendCrops(
  weather: WeatherData | null,
  soil: SoilData | null,
  province: Province,
): CropRecommendation[] {
  const recs: CropRecommendation[] = CROP_PROFILES.map((profile) => {
    const reasons: string[] = [];
    let fit = 0;
    let dims = 0;

    if (weather) {
      const rf = rangeFit(weather.precipitation, profile.rainfall);
      const tf = rangeFit(weather.temperature, profile.tempMean);
      fit += rf + tf; dims += 2;
      if (rf >= 0.9) reasons.push(`Rainfall ${Math.round(weather.precipitation)}mm matches`);
      else if (rf < 0.5) reasons.push(`Rainfall ${Math.round(weather.precipitation)}mm sub-optimal`);
      if (tf < 0.5) reasons.push(`Mean temp ${weather.temperature.toFixed(1)}°C off-range`);
    }
    if (soil) {
      const pf = rangeFit(soil.pH, profile.phRange);
      fit += pf; dims += 1;
      if (pf < 0.5) reasons.push(`pH ${soil.pH.toFixed(1)} outside ${profile.phRange[0]}–${profile.phRange[1]}`);
      else if (pf >= 0.9) reasons.push(`pH ${soil.pH.toFixed(1)} in optimal range`);
    }
    const baseFit = dims > 0 ? fit / dims : 0.5;

    let suit = baseFit * 100;
    if (profile.preferRegions?.includes(province.region)) {
      suit += 8;
      reasons.push(`${province.region} is a proven ${profile.name} region`);
    }
    if (province.primaryCrop && profile.name.toLowerCase().startsWith(province.primaryCrop)) {
      suit += 5;
    }
    suit = clamp01to100(suit);

    return {
      name: profile.name,
      nameVi: profile.nameVi,
      suitability: Math.round(suit),
      category: (suit >= 75 ? 'primary' : suit >= 50 ? 'secondary' : 'marginal') as CropRecommendation['category'],
      reasons: reasons.length ? reasons.slice(0, 3) : ['Within general tolerance'],
      yieldEstimate: profile.yield,
      marketDemand: profile.demand,
    };
  });

  recs.sort((a, b) => b.suitability - a.suitability);
  return recs.slice(0, 6);
}

/* --------------------------------------------------------------------------
 * Province-level forecast helpers.
 * -------------------------------------------------------------------------- */

export function syntheticWeatherForProvince(p: Province): WeatherData {
  // Tropical to subtropical regression by latitude.
  // VN ranges roughly 8.5°N (south) to 23°N (north).
  const lat = p.lat;
  const meanTemp =
    lat < 10 ? 27.5 :
    lat < 13 ? 26.5 :
    lat < 16 ? 25.5 :
    lat < 19 ? 24.0 :
    lat < 21 ? 23.0 : 21.0;

  // Region-based rainfall typical values (mm/yr)
  const regionRain: Record<string, number> = {
    'Northwest': 1700,
    'Northeast': 1800,
    'Red River Delta': 1700,
    'North Central': 2200,
    'South Central': 1800,
    'Central Highlands': 1900,
    'Southeast': 1900,
    'Mekong Delta': 1700,
  };
  const annualRain = regionRain[p.region] ?? 1800;

  // Build monthly profile — VN wet-season is roughly May–Oct, dryer Nov–Apr.
  const wetWeight = [0.04, 0.04, 0.05, 0.06, 0.10, 0.12, 0.13, 0.14, 0.13, 0.10, 0.06, 0.03];
  const monthlyRainfall = wetWeight.map((w) => Math.round(annualRain * w));

  // Highland regions cooler year-round
  const isHighland = p.region === 'Northwest' || p.region === 'Northeast' ||
    ['Lam Dong', 'Dak Lak', 'Dak Nong', 'Gia Lai', 'Kon Tum'].includes(p.name);
  const tAdj = isHighland ? -2.5 : 0;

  const monthlyTemp = Array.from({ length: 12 }, (_, i) => {
    const seasonalAdj = lat > 17
      ? -5 * Math.cos(((i - 6) * Math.PI) / 6) // northern strong seasonality
      : -1.5 * Math.cos(((i - 6) * Math.PI) / 6);
    return +(meanTemp + tAdj + seasonalAdj).toFixed(1);
  });

  return {
    temperature: meanTemp + tAdj,
    temperatureMin: meanTemp + tAdj - 6,
    temperatureMax: meanTemp + tAdj + 6,
    precipitation: annualRain,
    soilMoisture: 0.28,
    evapotranspiration: 1100,
    growingDays: lat < 17 ? 360 : 320,
    monthlyRainfall,
    monthlyTemp,
  };
}

/* --------------------------------------------------------------------------
 * Top-level assessment builder.
 * -------------------------------------------------------------------------- */
export interface BuildAssessmentInput {
  lat: number;
  lng: number;
  areaHa: number;
  weather: WeatherData | null;
  soil: SoilData | null;
  // Optional polygon for in-bounds analytics
  polygonCoords?: [number, number][];
}

export function buildAssessment(input: BuildAssessmentInput): LandAssessment {
  const { lat, lng, areaHa, weather, soil, polygonCoords } = input;
  const prov = nearestProvince(lat, lng);

  // EUDR analytics (mirrors EUDRChecker logic)
  let postCutoffLoss = 0;
  let nearbyLoss = 0;
  if (polygonCoords && polygonCoords.length >= 3) {
    const closed = [...polygonCoords, polygonCoords[0]];
    const polygon = turf.polygon([closed]);
    const center = turf.center(polygon);
    postCutoffLoss = forestLossPoints.filter((p) => {
      if (p.year < 2020) return false;
      return turf.booleanPointInPolygon(turf.point([p.lng, p.lat]), polygon);
    }).length;
    nearbyLoss = forestLossPoints.filter((p) => {
      const d = turf.distance(turf.point([p.lng, p.lat]), center, { units: 'kilometers' });
      return d < 30;
    }).length;
  } else {
    const center = turf.point([lng, lat]);
    nearbyLoss = forestLossPoints.filter((p) => {
      const d = turf.distance(turf.point([p.lng, p.lat]), center, { units: 'kilometers' });
      return d < 30;
    }).length;
  }

  const isEUDRCrop = ['coffee', 'rubber', 'cocoa', 'timber'].some((c) =>
    prov.primaryCrop.toLowerCase().includes(c),
  );

  const port = nearestPort(lat, lng);

  const suitability: SuitabilityScores = {
    soilQuality: Math.round(scoreSoil(soil)),
    waterAccess: Math.round(scoreWater(weather)),
    climate: Math.round(scoreClimate(weather)),
    marketAccess: Math.round(scoreMarketAccess(port, prov)),
    regulatorySafety: Math.round(scoreRegulatory(prov, postCutoffLoss, isEUDRCrop)),
    vegetationHealth: Math.round(scoreVegetation(prov)),
  };

  const score = Math.round(compositeScore(suitability));

  const fc2020 = interpolateYear(prov.forestCover, 2020);
  const fc2024 = interpolateYear(prov.forestCover, 2024);
  const changePct = fc2020 > 0 ? ((fc2024 - fc2020) / fc2020) * 100 : 0;

  const riskFactors: string[] = [];
  if (postCutoffLoss > 0) {
    riskFactors.push(`${postCutoffLoss} forest loss event(s) detected after 2020 EUDR cutoff`);
  }
  if (prov.lossRate[2024] > 0.015) {
    riskFactors.push(`Near ${prov.name} — high-risk province (${(prov.lossRate[2024] * 100).toFixed(1)}% loss rate)`);
  }
  if (isEUDRCrop) {
    riskFactors.push(`Region associated with ${prov.primaryCrop} — EUDR-regulated commodity`);
  }
  if (areaHa > 1000) {
    riskFactors.push(`Large area (${areaHa.toFixed(0)} ha) — recommend sub-plot due diligence`);
  }

  const eudrStatus: LandAssessment['eudr']['status'] =
    postCutoffLoss > 0 || prov.lossRate[2024] > 0.02 ? 'at_risk' : 'compliant';

  const crops = recommendCrops(weather, soil, prov);

  const dataCompleteness =
    (weather ? 0.45 : 0) +
    (soil ? 0.45 : 0) +
    0.1; // province data is always present

  return {
    investmentScore: score,
    rating: scoreToRating(score),
    suitability,
    weather,
    soil,
    eudr: {
      status: eudrStatus,
      forestCover2020: Math.round(fc2020),
      forestCover2024: Math.round(fc2024),
      changePercent: +changePct.toFixed(2),
      riskFactors,
      nearbyLossPoints: nearbyLoss,
    },
    nearestPort: port,
    cropRecommendations: crops,
    province: prov.name,
    region: prov.region,
    areaHa: Math.round(areaHa),
    coordinates: { lat: +lat.toFixed(4), lng: +lng.toFixed(4) },
    timestamp: new Date().toISOString(),
    dataCompleteness,
  };
}

/* --------------------------------------------------------------------------
 * Internal helpers.
 * -------------------------------------------------------------------------- */
function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
