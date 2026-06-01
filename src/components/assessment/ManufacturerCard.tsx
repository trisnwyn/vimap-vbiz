'use client';

import { Anchor, Truck, Factory, Users } from 'lucide-react';
import type { LandAssessment } from '@/types/assessment';
import { PROVINCE_ECONOMIC, grdpScore } from '@/data/province-economic';

interface Props {
  assessment: LandAssessment;
}

function laborTier(grdp: number): { tier: string; desc: string; color: string } {
  if (grdp >= 300_000) return { tier: 'Tier 1', desc: 'Large skilled workforce, competitive wages', color: 'text-emerald-600' };
  if (grdp >=  80_000) return { tier: 'Tier 2', desc: 'Moderate workforce pool, growing FDI base', color: 'text-blue-600' };
  return                      { tier: 'Tier 3', desc: 'Limited industrial labour, higher recruitment cost', color: 'text-orange-500' };
}

function exportInfraLabel(idx: number): { label: string; color: string } {
  if (idx >= 0.70) return { label: 'Excellent', color: 'text-emerald-600' };
  if (idx >= 0.45) return { label: 'Good',      color: 'text-blue-600' };
  if (idx >= 0.25) return { label: 'Adequate',  color: 'text-orange-500' };
  return                   { label: 'Limited',   color: 'text-red-500' };
}

const ROAD_LABELS = ['', 'Very poor', 'Poor', 'Moderate', 'Good', 'Excellent'];

function scoreColor(v: number): string {
  if (v >= 65) return 'text-emerald-600';
  if (v >= 45) return 'text-orange-500';
  return 'text-red-500';
}

export default function ManufacturerCard({ assessment }: Props) {
  const { suitability, nearestPort, province, region, provinceId, areaHa, dataCompleteness } = assessment;

  const econ = PROVINCE_ECONOMIC[provinceId];
  const roadLabel   = econ ? ROAD_LABELS[econ.roadQuality] ?? 'N/A' : 'N/A';
  const exportInfra = econ ? exportInfraLabel(econ.exportIndex) : exportInfraLabel(0.3);
  const labor       = econ ? laborTier(econ.grdp) : laborTier(50_000);
  const gScore      = econ ? Math.round(grdpScore(econ.grdp)) : 0;
  const exportPct   = econ ? Math.round(econ.exportIndex * 100) : 'N/A';

  // Supply chain composite: marketAccess (50%) + road (25%) + export infra (25%)
  const roadNorm = econ ? ((econ.roadQuality - 1) / 4) * 100 : 40;
  const exportNorm = econ ? econ.exportIndex * 100 : 30;
  const supplyChainScore = Math.round(
    suitability.marketAccess * 0.50 +
    roadNorm * 0.25 +
    exportNorm * 0.25,
  );

  return (
    <div className="space-y-2.5">
      {/* Supply chain hero */}
      <div className={`rounded-xl border p-3 ${
        supplyChainScore >= 65
          ? 'bg-blue-500/[0.07] border-blue-500/20'
          : supplyChainScore >= 45
          ? 'bg-orange-500/[0.07] border-orange-500/20'
          : 'bg-red-500/[0.07] border-red-500/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-black font-mono ${scoreColor(supplyChainScore)}`}>
            {supplyChainScore}
          </div>
          <div>
            <div className={`text-sm font-bold ${scoreColor(supplyChainScore)}`}>
              Supply Chain Score
            </div>
            <div className="text-[11px] text-[#6b7280]">
              Port distance · road quality · export infrastructure
            </div>
          </div>
        </div>
      </div>

      {/* Port & logistics */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Anchor className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Port &amp; Logistics</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniStat
            label="Nearest port"
            value={nearestPort.name.replace(' Port', '')}
            unit={`${nearestPort.distanceKm} km`}
          />
          <MiniStat
            label="Market access"
            value={`${suitability.marketAccess}/100`}
            valueClass={scoreColor(suitability.marketAccess)}
          />
          <MiniStat
            label="Export infrastructure"
            value={exportInfra.label}
            valueClass={exportInfra.color}
            unit={`${exportPct}% export activity`}
          />
          <MiniStat
            label="Road quality"
            value={roadLabel}
            valueClass={econ && econ.roadQuality >= 4
              ? 'text-emerald-600'
              : econ && econ.roadQuality >= 3
              ? 'text-orange-500'
              : 'text-red-500'}
          />
        </div>
      </div>

      {/* Labour & economics */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Labour Market</span>
        </div>
        <div className="mb-2 rounded-md bg-white/60 border border-[#35b779]/[0.10] px-2.5 py-2">
          <div className={`text-sm font-bold ${labor.color}`}>{labor.tier}</div>
          <div className="text-[11px] text-[#6b7280] leading-snug mt-0.5">{labor.desc}</div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniStat
            label="Province"
            value={province}
            unit={region}
          />
          <MiniStat
            label="GRDP strength"
            value={`${gScore}/100`}
            valueClass={scoreColor(gScore)}
            unit="log-normalised"
          />
        </div>
      </div>

      {/* Site conditions */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Factory className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Site Conditions</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniStat
            label="Plot area"
            value={`${areaHa.toLocaleString()}`}
            unit="ha"
          />
          <MiniStat
            label="Regulatory safety"
            value={`${suitability.regulatorySafety}/100`}
            valueClass={scoreColor(suitability.regulatorySafety)}
          />
          <MiniStat
            label="Water access"
            value={`${suitability.waterAccess}/100`}
            valueClass={scoreColor(suitability.waterAccess)}
          />
          <MiniStat
            label="Data quality"
            value={`${Math.round(dataCompleteness * 100)}%`}
            valueClass={dataCompleteness >= 0.8 ? 'text-emerald-600' : 'text-orange-500'}
          />
        </div>
      </div>

      {/* Score bars */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Truck className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">All Factors</span>
        </div>
        <div className="space-y-1.5">
          {([
            ['Market access',     suitability.marketAccess],
            ['Regulatory safety', suitability.regulatorySafety],
            ['Water / utilities', suitability.waterAccess],
            ['Soil bearing cap.', suitability.soilQuality],
          ] as [string, number][]).map(([label, val]) => (
            <ScoreBar key={label} label={label} value={val} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[#6b7280] leading-relaxed px-0.5">
        Labour tier and GRDP strength derived from Vietnam GSO 2023 provincial statistics.
        Road quality from VDOT infrastructure index. Supplement with site-specific due
        diligence and MPI investment approval review.
      </p>
    </div>
  );
}

function MiniStat({
  label, value, unit, valueClass = 'text-[#111827]',
}: { label: string; value: string; unit?: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-white/60 border border-[#35b779]/[0.10] px-2 py-1.5">
      <div className="text-[10px] text-[#6b7280] uppercase tracking-wider truncate">{label}</div>
      <div className={`text-sm font-bold font-mono leading-tight ${valueClass}`}>{value}</div>
      {unit && <div className="text-[10px] text-[#6b7280] truncate">{unit}</div>}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 65 ? 'bg-emerald-500' : value >= 45 ? 'bg-orange-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[10px] text-[#6b7280]">{label}</span>
        <span className="text-[10px] font-mono text-[#374151]">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-[#e5e7eb] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
