export interface Province {
  id: string;
  name: string;
  nameVi: string;
  lat: number;
  lng: number;
  region: string;
  forestCover: Record<number, number>;
  forestLoss: Record<number, number>;
  lossRate: Record<number, number>;
  primaryCrop: string;
  area: number;
}

export interface ForestLossPoint {
  id: string;
  lat: number;
  lng: number;
  year: number;
  intensity: number;
  cause: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  date: string;
  summary: string;
  lat: number;
  lng: number;
  category: 'eudr' | 'deforestation' | 'policy' | 'climate' | 'agriculture';
  url: string;
}

export interface LULCClass {
  id: string;
  name: string;
  color: string;
  description: string;
  icon: string;
}

export interface EUDRResult {
  status: 'compliant' | 'at_risk' | 'unknown';
  forestCover2020: number;
  forestCover2024: number;
  changePercent: number;
  riskFactors: string[];
  nearbyLossPoints: number;
}
