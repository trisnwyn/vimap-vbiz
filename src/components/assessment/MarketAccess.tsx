'use client';

import { Anchor, MapPin, TrendingUp } from 'lucide-react';
import type { LandAssessment, NearestPort } from '@/types/assessment';

interface Props {
  port: NearestPort;
  province: string;
  region: string;
  areaHa: number;
  coordinates: LandAssessment['coordinates'];
  bare?: boolean;
}

function logisticsTier(km: number): { label: string; color: string } {
  if (km < 50)  return { label: 'Excellent — same metro', color: 'text-emerald-600' };
  if (km < 150) return { label: 'Strong — short haul',    color: 'text-green-600' };
  if (km < 300) return { label: 'Moderate — regional',    color: 'text-yellow-600' };
  if (km < 500) return { label: 'Constrained — long haul',color: 'text-orange-500' };
  return            { label: 'Difficult — inland',        color: 'text-red-500' };
}

export default function MarketAccess({ port, province, region, areaHa, coordinates, bare = false }: Props) {
  const tier = logisticsTier(port.distanceKm);

  const body = (
    <>
      <div className="rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.10] p-2 mb-2">
        <div className="flex items-center gap-2">
          <Anchor className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#111827] truncate">{port.name}</div>
            <div className="text-[10px] text-[#6b7280]">Nearest export port</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-[#111827] font-mono">{port.distanceKm}</div>
            <div className="text-[10px] text-[#6b7280]">km</div>
          </div>
        </div>
        <div className={`text-[11px] mt-1 ${tier.color}`}>
          <TrendingUp className="w-3 h-3 inline-block mr-1 -mt-px" />
          {tier.label}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.10] px-2 py-1.5">
          <div className="flex items-center gap-1 mb-0.5">
            <MapPin className="w-3 h-3 text-[#6b7280]" />
            <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Region</span>
          </div>
          <div className="text-xs font-bold text-[#111827]">{region}</div>
          <div className="text-[10px] text-[#6b7280] truncate">via {province}</div>
        </div>
        <div className="rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.10] px-2 py-1.5">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Area</div>
          <div className="text-xs font-bold text-[#111827] font-mono">
            {areaHa.toLocaleString()} ha
          </div>
          <div className="text-[10px] text-[#6b7280] font-mono">
            {coordinates.lat.toFixed(2)}°N, {coordinates.lng.toFixed(2)}°E
          </div>
        </div>
      </div>
    </>
  );

  if (bare) return body;

  return (
    <div className="rounded-xl p-3 border border-[#35b779]/[0.15] bg-white/60 shadow-sm animate-fade-in">
      <h4 className="text-xs text-[#1f2937] font-semibold uppercase tracking-wider mb-2">
        Market &amp; Logistics
      </h4>
      {body}
    </div>
  );
}
