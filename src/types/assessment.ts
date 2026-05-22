// Land Investment Assessment types

export interface WeatherData {
  temperature: number;        // Annual mean temp °C
  temperatureMin: number;     // Annual min
  temperatureMax: number;     // Annual max
  precipitation: number;      // Total mm/year
  soilMoisture: number;       // m³/m³ (0-1) — surface average
  evapotranspiration: number; // mm/year
  growingDays: number;        // days/year with mean temp > 10°C
  monthlyRainfall: number[];  // 12 months mm
  monthlyTemp: number[];      // 12 months °C
}

export interface SoilData {
  type: string;               // WRB / general taxonomy name
  description: string;
  pH: number;                 // 0-14
  organicCarbon: number;      // g/kg
  nitrogen: number;           // g/kg
  cec: number;                // cmol/kg (cation exchange capacity)
  bulkDensity: number;        // kg/dm³
  sand: number;               // %
  silt: number;               // %
  clay: number;               // %
  textureClass: string;       // USDA texture triangle
  waterRetention: {
    fieldCapacity: number;    // cm³/cm³
    wiltingPoint: number;
    availableWater: number;
  };
}

export interface SuitabilityScores {
  soilQuality: number;       // 0-100
  waterAccess: number;       // 0-100
  climate: number;           // 0-100
  marketAccess: number;      // 0-100
  regulatorySafety: number;  // 0-100
  vegetationHealth: number;  // 0-100
}

export interface CropRecommendation {
  name: string;
  nameVi: string;
  suitability: number;       // 0-100
  category: 'primary' | 'secondary' | 'marginal';
  reasons: string[];
  yieldEstimate?: string;
  marketDemand: 'high' | 'medium' | 'low';
}

export interface NearestPort {
  name: string;
  distanceKm: number;
}

export interface LandAssessment {
  // Composite score
  investmentScore: number;   // 0-100
  rating: 'excellent' | 'good' | 'moderate' | 'poor' | 'unsuitable';

  // Sub-scores
  suitability: SuitabilityScores;

  // Data
  weather: WeatherData | null;
  soil: SoilData | null;

  // EUDR compliance (reuse existing schema)
  eudr: {
    status: 'compliant' | 'at_risk' | 'unknown';
    forestCover2020: number;
    forestCover2024: number;
    changePercent: number;
    riskFactors: string[];
    nearbyLossPoints: number;
  };

  // Economic
  nearestPort: NearestPort;
  cropRecommendations: CropRecommendation[];

  // Location context
  province: string;
  region: string;
  areaHa: number;
  coordinates: { lat: number; lng: number };

  // Metadata
  timestamp: string;
  dataCompleteness: number;  // 0-1, how much real data vs estimates
}

export type AssessmentMode = 'polygon' | 'province';
