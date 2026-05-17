'use client';

import { useMemo } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Pencil, Trash2, Info } from 'lucide-react';
import { forestLossPoints } from '@/data/forest-loss';
import { provinces } from '@/data/provinces';
import * as turf from '@turf/turf';
import type { EUDRResult } from '@/types';

interface EUDRCheckerProps {
  drawingMode: boolean;
  drawPoints: [number, number][];
  onStartDraw: () => void;
  onClearDraw: () => void;
}

function analyzePolygon(coords: [number, number][]): EUDRResult {
  if (coords.length < 3) {
    return {
      status: 'unknown',
      forestCover2020: 0,
      forestCover2024: 0,
      changePercent: 0,
      riskFactors: [],
      nearbyLossPoints: 0,
    };
  }

  const closed = [...coords, coords[0]];
  const polygon = turf.polygon([closed]);
  const center = turf.center(polygon);
  const areaKm2 = turf.area(polygon) / 1_000_000;

  const postCutoffLoss = forestLossPoints.filter((p) => {
    if (p.year < 2020) return false;
    const pt = turf.point([p.lng, p.lat]);
    return turf.booleanPointInPolygon(pt, polygon);
  });

  const allNearby = forestLossPoints.filter((p) => {
    const pt = turf.point([p.lng, p.lat]);
    const dist = turf.distance(pt, center, { units: 'kilometers' });
    return dist < 30;
  });

  const nearestProvince = provinces.reduce((closest, p) => {
    const dist = turf.distance(
      turf.point([p.lng, p.lat]),
      center,
      { units: 'kilometers' },
    );
    const closestDist = turf.distance(
      turf.point([closest.lng, closest.lat]),
      center,
      { units: 'kilometers' },
    );
    return dist < closestDist ? p : closest;
  }, provinces[0]);

  const fc2020 = nearestProvince.forestCover[2020] ?? nearestProvince.forestCover[2015] ?? 0;
  const fc2024 = nearestProvince.forestCover[2024] ?? 0;
  const changePercent = fc2020 > 0 ? ((fc2024 - fc2020) / fc2020) * 100 : 0;

  const riskFactors: string[] = [];
  if (postCutoffLoss.length > 0) {
    riskFactors.push(
      `${postCutoffLoss.length} forest loss event(s) detected inside polygon after 2020 cutoff`,
    );
  }
  if (nearestProvince.lossRate[2024] > 0.015) {
    riskFactors.push(
      `Located near ${nearestProvince.name} — high-risk province (${(nearestProvince.lossRate[2024] * 100).toFixed(1)}% loss rate)`,
    );
  }
  if (nearestProvince.primaryCrop === 'coffee' || nearestProvince.primaryCrop === 'rubber') {
    riskFactors.push(
      `Region associated with ${nearestProvince.primaryCrop} expansion — EUDR-regulated commodity`,
    );
  }
  if (areaKm2 > 10) {
    riskFactors.push(`Large area (${areaKm2.toFixed(1)} km²) — detailed sub-plot analysis recommended`);
  }

  const status: EUDRResult['status'] =
    postCutoffLoss.length > 0 || (nearestProvince.lossRate[2024] > 0.02)
      ? 'at_risk'
      : 'compliant';

  return {
    status,
    forestCover2020: fc2020,
    forestCover2024: fc2024,
    changePercent,
    riskFactors,
    nearbyLossPoints: allNearby.length,
  };
}

export default function EUDRChecker({
  drawingMode,
  drawPoints,
  onStartDraw,
  onClearDraw,
}: EUDRCheckerProps) {
  const result = useMemo(() => {
    if (drawPoints.length < 3) return null;
    return analyzePolygon(drawPoints);
  }, [drawPoints]);

  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <div>
        <h3 className="text-xs font-bold text-white mb-1">EUDR Plot Checker</h3>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Draw a polygon on the map to check forest-status compliance against the EU Deforestation
          Regulation (cutoff: 31 Dec 2020).
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={drawingMode ? onClearDraw : onStartDraw}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            drawingMode
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/15'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          {drawingMode ? 'Drawing... click map' : 'Draw Area'}
        </button>
        {drawPoints.length > 0 && (
          <button
            onClick={onClearDraw}
            className="px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {drawingMode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/[0.06] border border-accent/10 animate-fade-in">
          <Info className="w-3.5 h-3.5 text-accent shrink-0" />
          <p className="text-[10px] text-gray-300">
            Click points on the map to draw a polygon. Need at least 3 points.
            {drawPoints.length > 0 && (
              <span className="text-accent font-medium ml-1">
                ({drawPoints.length} point{drawPoints.length !== 1 ? 's' : ''} placed)
              </span>
            )}
          </p>
        </div>
      )}

      {result && (
        <div className="animate-fade-in space-y-3">
          <div
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              result.status === 'compliant'
                ? 'bg-green-500/[0.08] border-green-500/20'
                : 'bg-red-500/[0.08] border-red-500/20'
            }`}
          >
            {result.status === 'compliant' ? (
              <ShieldCheck className="w-8 h-8 text-green-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-red-400 shrink-0" />
            )}
            <div>
              <div
                className={`text-sm font-bold ${
                  result.status === 'compliant' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {result.status === 'compliant' ? 'LIKELY COMPLIANT' : 'AT RISK'}
              </div>
              <div className="text-[10px] text-gray-400">
                EUDR Deforestation Assessment (post-2020)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="stat-card">
              <div className="text-[10px] text-gray-400 mb-1">Forest Cover ~2020</div>
              <div className="text-sm font-bold text-white font-mono">
                {(result.forestCover2020 / 1000).toFixed(0)}K ha
              </div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] text-gray-400 mb-1">Forest Cover 2024</div>
              <div className="text-sm font-bold text-white font-mono">
                {(result.forestCover2024 / 1000).toFixed(0)}K ha
              </div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] text-gray-400 mb-1">Change</div>
              <div
                className={`text-sm font-bold font-mono ${
                  result.changePercent < 0 ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {result.changePercent > 0 ? '+' : ''}
                {result.changePercent.toFixed(1)}%
              </div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] text-gray-400 mb-1">Nearby Loss Events</div>
              <div className="text-sm font-bold text-orange-400 font-mono">
                {result.nearbyLossPoints}
              </div>
            </div>
          </div>

          {result.riskFactors.length > 0 && (
            <div>
              <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
                Risk Factors
              </h4>
              <div className="space-y-1.5">
                {result.riskFactors.map((rf, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-md bg-red-500/[0.05] border border-red-500/10"
                  >
                    <Shield className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-gray-300 leading-relaxed">{rf}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.04]">
            <p className="text-[9px] text-gray-500 leading-relaxed">
              This assessment uses modeled data and should not be used as sole evidence for EUDR
              compliance. Cross-reference with official MARD forestry data and high-resolution
              imagery for due diligence submissions.
            </p>
          </div>
        </div>
      )}

      {!result && !drawingMode && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <Shield className="w-12 h-12 text-gray-700 mb-3" />
          <p className="text-xs text-gray-500 leading-relaxed">
            Draw an area on the map to check EUDR compliance status. The checker analyzes
            forest cover change relative to the December 31, 2020 cutoff date.
          </p>
        </div>
      )}
    </div>
  );
}
