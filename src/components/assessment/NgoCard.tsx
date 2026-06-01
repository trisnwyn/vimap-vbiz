'use client';

import { TreePine, Droplets, Wind, Sprout } from 'lucide-react';
import type { LandAssessment } from '@/types/assessment';

interface Props {
  assessment: LandAssessment;
}

function conservationScore(suitability: LandAssessment['suitability']): number {
  return Math.round(
    (suitability.vegetationHealth * 0.40 +
     suitability.regulatorySafety * 0.35 +
     suitability.waterAccess      * 0.25),
  );
}

function reforestSuitability(
  soilQuality: number, waterAccess: number, climate: number,
): { label: string; color: string } {
  const avg = (soilQuality + waterAccess + climate) / 3;
  if (avg >= 65) return { label: 'High', color: 'text-emerald-600' };
  if (avg >= 48) return { label: 'Moderate', color: 'text-orange-500' };
  return { label: 'Low', color: 'text-red-500' };
}

function scoreColor(v: number): string {
  if (v >= 65) return 'text-emerald-600';
  if (v >= 45) return 'text-orange-500';
  return 'text-red-500';
}

export default function NgoCard({ assessment }: Props) {
  const { suitability, areaHa, eudr } = assessment;
  const conScore = conservationScore(suitability);
  const reforest = reforestSuitability(suitability.soilQuality, suitability.waterAccess, suitability.climate);

  // Carbon sequestration potential (standing + annual)
  const seqRatePerHa = 4 + (suitability.vegetationHealth / 100) * 10; // 4–14 tCO₂/ha/yr
  const annualSeqTons = Math.round(areaHa * seqRatePerHa);
  const forestFraction = suitability.vegetationHealth / 100;
  const estimatedForestHa = Math.round(areaHa * forestFraction);

  // Province-level forest cover trend
  const coverChangeSign = eudr.changePercent > 0 ? '+' : '';
  const coverChangeColor = eudr.changePercent < -2 ? 'text-red-500'
    : eudr.changePercent < 0 ? 'text-orange-500'
    : 'text-emerald-600';

  return (
    <div className="space-y-2.5">
      {/* Conservation score hero */}
      <div className={`rounded-xl border p-3 ${
        conScore >= 65
          ? 'bg-emerald-500/[0.08] border-emerald-500/25'
          : conScore >= 45
          ? 'bg-orange-500/[0.08] border-orange-500/25'
          : 'bg-red-500/[0.08] border-red-500/25'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-black font-mono ${scoreColor(conScore)}`}>
            {conScore}
          </div>
          <div>
            <div className={`text-sm font-bold ${scoreColor(conScore)}`}>
              Conservation Score
            </div>
            <div className="text-[11px] text-[#6b7280]">
              Vegetation · regulatory safety · water access
            </div>
          </div>
        </div>
      </div>

      {/* Forest cover */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <TreePine className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Forest Cover (Province)</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <MiniStat
            label="Cover 2020"
            value={`${(eudr.forestCover2020 / 1000).toFixed(0)}K`}
            unit="ha"
          />
          <MiniStat
            label="Cover 2024"
            value={`${(eudr.forestCover2024 / 1000).toFixed(0)}K`}
            unit="ha"
          />
          <MiniStat
            label="Change"
            value={`${coverChangeSign}${eudr.changePercent.toFixed(1)}%`}
            valueClass={coverChangeColor}
          />
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <MiniStat
            label="EUDR status"
            value={eudr.status === 'compliant' ? 'Compliant' : eudr.status === 'at_risk' ? 'At risk' : 'Unknown'}
            valueClass={eudr.status === 'compliant' ? 'text-emerald-600' : 'text-red-500'}
          />
          <MiniStat
            label="Est. forest on plot"
            value={`~${estimatedForestHa.toLocaleString()}`}
            unit="ha (proxy)"
          />
        </div>
      </div>

      {/* Carbon sequestration */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Wind className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Carbon &amp; Climate</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniStat
            label="Annual seq. potential"
            value={annualSeqTons >= 1000
              ? `${(annualSeqTons / 1000).toFixed(1)}K`
              : String(annualSeqTons)}
            unit="tCO₂/yr (est.)"
          />
          <MiniStat
            label="Seq. rate"
            value={`${seqRatePerHa.toFixed(1)}`}
            unit="tCO₂/ha/yr"
          />
          <MiniStat
            label="Climate score"
            value={`${suitability.climate}/100`}
            valueClass={scoreColor(suitability.climate)}
          />
          <MiniStat
            label="Water access"
            value={`${suitability.waterAccess}/100`}
            valueClass={scoreColor(suitability.waterAccess)}
          />
        </div>
      </div>

      {/* Reforestation suitability */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Sprout className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Reforestation Suitability</span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-lg font-black font-mono ${reforest.color}`}>{reforest.label}</span>
          <span className="text-[11px] text-[#6b7280]">Based on soil · water · climate</span>
        </div>
        <div className="space-y-1.5">
          {([
            ['Soil quality',    suitability.soilQuality],
            ['Water access',    suitability.waterAccess],
            ['Climate fitness', suitability.climate],
            ['Veg. health',     suitability.vegetationHealth],
          ] as [string, number][]).map(([label, val]) => (
            <ScoreBar key={label} label={label} value={val} />
          ))}
        </div>
      </div>

      {/* Water */}
      <div className="flex items-start gap-1.5 px-0.5">
        <Droplets className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-[#6b7280] leading-relaxed">
          Carbon sequestration estimated at {seqRatePerHa.toFixed(1)} tCO₂/ha/yr using vegetation
          health as a canopy-density proxy (tropical forest range: 4–14 t). Cross-reference with
          MARD national forest inventory for project-level MRV.
        </p>
      </div>
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
