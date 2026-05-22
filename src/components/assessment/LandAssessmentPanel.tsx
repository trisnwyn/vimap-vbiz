'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as turf from '@turf/turf';
import {
  Pencil, Trash2, Target, Info, Loader2, AlertCircle, Building2,
  Hexagon, CloudRain, FlaskConical, Wheat, Anchor, ShieldCheck,
} from 'lucide-react';
import { provinces } from '@/data/provinces';
import { buildAssessment, syntheticWeatherForProvince } from '@/lib/scoring';
import type { WeatherData, SoilData } from '@/types/assessment';
import InvestmentScore from './InvestmentScore';
import SuitabilityRadar from './SuitabilityRadar';
import WeatherCard from './WeatherCard';
import SoilProfile from './SoilProfile';
import CropViability from './CropViability';
import EUDRSection from './EUDRSection';
import MarketAccess from './MarketAccess';
import CollapsibleSection from './CollapsibleSection';

type Density = 'compact' | 'wide';

interface Props {
  drawingMode: boolean;
  drawPoints: [number, number][];
  selectedProvinceId: string | null;
  onStartDraw: () => void;
  onClearDraw: () => void;
  density?: Density;
}

type AssessTarget =
  | { kind: 'polygon'; lat: number; lng: number; areaHa: number; polygonCoords: [number, number][]; provinceId: null }
  | { kind: 'province'; lat: number; lng: number; areaHa: number; polygonCoords: undefined; provinceId: string };

function deriveTarget(drawPoints: [number, number][], selectedProvinceId: string | null): AssessTarget | null {
  if (drawPoints.length >= 3) {
    const closed: [number, number][] = [...drawPoints, drawPoints[0]];
    const polygon = turf.polygon([closed]);
    const center = turf.center(polygon);
    const [lng, lat] = center.geometry.coordinates as [number, number];
    const areaHa = turf.area(polygon) / 10_000;
    return { kind: 'polygon', lat, lng, areaHa, polygonCoords: drawPoints, provinceId: null };
  }
  if (selectedProvinceId) {
    const p = provinces.find((x) => x.id === selectedProvinceId);
    if (p) {
      return { kind: 'province', lat: p.lat, lng: p.lng, areaHa: p.area * 100, polygonCoords: undefined, provinceId: p.id };
    }
  }
  return null;
}

export default function LandAssessmentPanel({
  drawingMode,
  drawPoints,
  selectedProvinceId,
  onStartDraw,
  onClearDraw,
  density = 'compact',
}: Props) {
  const target = useMemo(
    () => deriveTarget(drawPoints, selectedProvinceId),
    [drawPoints, selectedProvinceId],
  );

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [soil, setSoil] = useState<SoilData | null>(null);
  const [weatherSource, setWeatherSource] = useState<string>('');
  const [soilSource, setSoilSource] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const cacheKey = target ? `${target.lat.toFixed(3)}_${target.lng.toFixed(3)}_${target.provinceId ?? ''}` : '';
  const lastFetchedKey = useRef<string>('');

  useEffect(() => {
    if (!target) {
      setWeather(null);
      setSoil(null);
      setWeatherSource('');
      setSoilSource('');
      setFetchError(null);
      setLoading(false);
      lastFetchedKey.current = '';
      return;
    }
    if (cacheKey === lastFetchedKey.current) return;
    lastFetchedKey.current = cacheKey;

    const controller = new AbortController();
    setLoading(true);
    setFetchError(null);

    const { lat, lng, provinceId } = target;

    const fetchWithRetry = async (url: string, retries = 2): Promise<Response> => {
      for (let i = 0; i <= retries; i++) {
        const r = await fetch(url, { signal: controller.signal });
        if (r.ok || i === retries) return r;
        await new Promise((res) => setTimeout(res, 800 * (i + 1)));
      }
      return fetch(url, { signal: controller.signal });
    };

    Promise.allSettled([
      fetchWithRetry(`/api/weather?lat=${lat}&lng=${lng}`)
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(`weather ${r.status}`))),
      fetchWithRetry(`/api/soil?lat=${lat}&lng=${lng}`)
        .then((r) => r.ok ? r.json() : Promise.reject(new Error(`soil ${r.status}`))),
    ]).then(([w, s]) => {
      if (controller.signal.aborted) return;

      let weatherData: WeatherData | null = null;
      if (w.status === 'fulfilled' && w.value?.data) {
        weatherData = w.value.data as WeatherData;
        setWeatherSource(w.value.source ?? '');
      } else if (provinceId) {
        const p = provinces.find((pv) => pv.id === provinceId);
        if (p) {
          weatherData = syntheticWeatherForProvince(p);
          setWeatherSource('Modeled (offline)');
        }
      }
      setWeather(weatherData);

      if (s.status === 'fulfilled' && s.value?.data) {
        setSoil(s.value.data as SoilData);
        setSoilSource(s.value.source ?? '');
      } else {
        setSoil(null);
        setSoilSource('');
      }

      if (w.status === 'rejected' && s.status === 'rejected') {
        setFetchError('Could not reach weather and soil services. Showing modeled fallbacks.');
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [cacheKey, target]);

  const assessment = useMemo(() => {
    if (!target) return null;
    return buildAssessment({
      lat: target.lat,
      lng: target.lng,
      areaHa: target.areaHa,
      weather,
      soil,
      polygonCoords: target.polygonCoords,
    });
  }, [target, weather, soil]);

  const isWide = density === 'wide';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 pb-2 border-b border-[#35b779]/[0.15] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-3.5 h-3.5 text-accent" />
          <h3 className="text-xs font-bold text-[#111827]">Land Investment Assessment</h3>
        </div>
        <p className="text-[11px] text-[#6b7280] leading-snug">
          Draw a polygon, or click a province, for a composite suitability score.
        </p>

        <div className="flex gap-2 mt-2">
          <button
            onClick={drawingMode ? onClearDraw : onStartDraw}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              drawingMode
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/15'
            }`}
          >
            <Pencil className="w-3.5 h-3.5" />
            {drawingMode ? 'Drawing… click map' : 'Draw Area'}
          </button>
          {drawPoints.length > 0 && (
            <button
              onClick={onClearDraw}
              className="px-3 py-2 rounded-lg text-xs text-[#374151] hover:text-[#111827] bg-[#35b779]/[0.06] hover:bg-[#35b779]/[0.12] border border-[#35b779]/[0.15] transition-all"
              aria-label="Clear drawing"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {drawingMode && (
          <div className="flex items-center gap-2 mt-2 px-2.5 py-1.5 rounded-md bg-accent/[0.06] border border-accent/10 animate-fade-in">
            <Info className="w-3 h-3 text-accent shrink-0" />
            <p className="text-[11px] text-[#1f2937]">
              Click points on the map. Need at least 3.
              {drawPoints.length > 0 && (
                <span className="text-accent font-medium ml-1">
                  ({drawPoints.length} placed)
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {!target && (
          <div className="p-3"><EmptyState /></div>
        )}

        {target && (
          <div className={`p-3 ${isWide ? 'max-w-[1280px] mx-auto' : ''}`}>
            <TargetBadge target={target} loading={loading} />
            {fetchError && (
              <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-yellow-500/[0.06] border border-yellow-500/15">
                <AlertCircle className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#374151] leading-snug">{fetchError}</p>
              </div>
            )}

            {assessment && (
              <>
                <div className={`mt-3 grid gap-3 ${isWide ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                  <InvestmentScore
                    score={assessment.investmentScore}
                    rating={assessment.rating}
                    dataCompleteness={assessment.dataCompleteness}
                  />
                  <SuitabilityRadar scores={assessment.suitability} />
                </div>

                <div className={`mt-3 grid gap-3 ${isWide ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                  <CollapsibleSection
                    title="Climate"
                    subtitle={weatherSource || 'Annual climate window'}
                    icon={<CloudRain className="w-3.5 h-3.5 text-blue-500" />}
                    defaultOpen
                  >
                    <WeatherCard weather={assessment.weather} bare />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Soil"
                    subtitle={soilSource || 'Top 30 cm aggregate'}
                    icon={<FlaskConical className="w-3.5 h-3.5 text-pink-400" />}
                    defaultOpen
                  >
                    <SoilProfile soil={assessment.soil} bare />
                  </CollapsibleSection>
                </div>

                <div className="mt-3">
                  <CollapsibleSection
                    title="Crop Viability"
                    subtitle={`Top ${assessment.cropRecommendations.length} fits`}
                    icon={<Wheat className="w-3.5 h-3.5 text-amber-500" />}
                    defaultOpen={isWide}
                  >
                    <CropViability crops={assessment.cropRecommendations} bare />
                  </CollapsibleSection>
                </div>

                <div className={`mt-3 grid gap-3 ${isWide ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                  <CollapsibleSection
                    title="Market & Logistics"
                    subtitle={`Nearest port · ${assessment.nearestPort.distanceKm} km`}
                    icon={<Anchor className="w-3.5 h-3.5 text-blue-500" />}
                    defaultOpen={false}
                  >
                    <MarketAccess
                      port={assessment.nearestPort}
                      province={assessment.province}
                      region={assessment.region}
                      areaHa={assessment.areaHa}
                      coordinates={assessment.coordinates}
                      bare
                    />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="EUDR Compliance"
                    subtitle={assessment.eudr.status === 'compliant' ? 'Likely compliant' : 'At risk · review'}
                    icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                    defaultOpen={false}
                  >
                    <EUDRSection eudr={assessment.eudr} bare />
                  </CollapsibleSection>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TargetBadge({ target, loading }: { target: AssessTarget; loading: boolean }) {
  if (target.kind === 'polygon') {
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.12]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Hexagon className="w-3 h-3 text-accent shrink-0" />
          <span className="text-[11px] text-[#1f2937] truncate">
            Polygon · <span className="font-mono text-[#111827]">{target.areaHa.toFixed(0)} ha</span>
            <span className="text-[#6b7280]"> · {target.polygonCoords.length} vertices</span>
          </span>
        </div>
        {loading && <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" />}
      </div>
    );
  }
  const prov = provinces.find((p) => p.id === target.provinceId);
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.12]">
      <div className="flex items-center gap-1.5 min-w-0">
        <Building2 className="w-3 h-3 text-accent shrink-0" />
        <span className="text-[11px] text-[#1f2937] truncate">
          Province · <span className="font-mono text-[#111827]">{prov?.name ?? target.provinceId}</span>
          {prov && <span className="text-[#6b7280]"> · {prov.region}</span>}
        </span>
      </div>
      {loading && <Loader2 className="w-3 h-3 text-accent animate-spin shrink-0" />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-accent/[0.08] border border-accent/15 flex items-center justify-center mb-3">
        <Target className="w-5 h-5 text-accent" />
      </div>
      <p className="text-xs text-[#1f2937] leading-relaxed max-w-[240px]">
        Pick a target to assess
      </p>
      <p className="text-[11px] text-[#6b7280] leading-relaxed mt-1 max-w-[240px]">
        Use <span className="text-accent">Draw Area</span> above, or click any
        province on the map.
      </p>
    </div>
  );
}
