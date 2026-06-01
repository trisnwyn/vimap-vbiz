'use client';

import { TrendingUp, Leaf, Banknote, BarChart2 } from 'lucide-react';
import type { LandAssessment } from '@/types/assessment';
import { PROVINCE_ECONOMIC } from '@/data/province-economic';

interface Props {
  assessment: LandAssessment;
}

type RiskGrade = 'A' | 'B' | 'C' | 'D';

function riskGrade(investmentScore: number, regScore: number): RiskGrade {
  if (investmentScore >= 75 && regScore >= 70) return 'A';
  if (investmentScore >= 60 && regScore >= 55) return 'B';
  if (investmentScore >= 45 || regScore >= 40) return 'C';
  return 'D';
}

const GRADE_META: Record<RiskGrade, { label: string; color: string; bg: string; border: string }> = {
  A: { label: 'Low risk', color: 'text-emerald-600', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/25' },
  B: { label: 'Moderate risk', color: 'text-blue-600', bg: 'bg-blue-500/[0.08]', border: 'border-blue-500/25' },
  C: { label: 'Elevated risk', color: 'text-orange-500', bg: 'bg-orange-500/[0.08]', border: 'border-orange-500/25' },
  D: { label: 'High risk', color: 'text-red-500', bg: 'bg-red-500/[0.08]', border: 'border-red-500/25' },
};

function liquidityLabel(marketScore: number): { label: string; color: string } {
  if (marketScore >= 70) return { label: 'High', color: 'text-emerald-600' };
  if (marketScore >= 45) return { label: 'Moderate', color: 'text-orange-500' };
  return { label: 'Low', color: 'text-red-500' };
}

export default function FinancierCard({ assessment }: Props) {
  const { investmentScore, suitability, areaHa, eudr, nearestPort, provinceId } = assessment;

  const grade = riskGrade(investmentScore, suitability.regulatorySafety);
  const gradeMeta = GRADE_META[grade];
  const liquidity = liquidityLabel(suitability.marketAccess);

  // Carbon asset estimate: area × forest density proxy × tropical sequestration rate
  // vegetationHealth/100 as density proxy; 120 tCO2/ha conservative tropical standing stock
  const forestFraction = suitability.vegetationHealth / 100;
  const carbonStockTons = Math.round(areaHa * forestFraction * 120);
  const carbonValueUsd = Math.round(carbonStockTons * 15); // $15/tCO2 voluntary market

  // Annual sequestration: 4–12 tCO2/ha/yr proportional to veg health
  const seqRatePerHa = 4 + (suitability.vegetationHealth / 100) * 8;
  const annualSeqTons = Math.round(areaHa * seqRatePerHa);

  // Road quality from economic data
  const econ = PROVINCE_ECONOMIC[provinceId];
  const roadLabel = econ
    ? ['', 'Very poor', 'Poor', 'Moderate', 'Good', 'Excellent'][econ.roadQuality] ?? 'Moderate'
    : 'N/A';

  return (
    <div className="space-y-2.5">
      {/* Risk grade hero */}
      <div className={`rounded-xl border p-3 ${gradeMeta.bg} ${gradeMeta.border}`}>
        <div className="flex items-center gap-3">
          <div className={`text-3xl font-black font-mono ${gradeMeta.color}`}>{grade}</div>
          <div>
            <div className={`text-sm font-bold ${gradeMeta.color}`}>{gradeMeta.label}</div>
            <div className="text-[11px] text-[#6b7280]">
              Investment {investmentScore}/100 · Regulatory {suitability.regulatorySafety}/100
            </div>
          </div>
        </div>
      </div>

      {/* Carbon asset */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Leaf className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Carbon Asset</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniStat
            label="Standing stock"
            value={carbonStockTons >= 1000 ? `${(carbonStockTons / 1000).toFixed(1)}K` : String(carbonStockTons)}
            unit="tCO₂"
          />
          <MiniStat
            label="Market value"
            value={carbonValueUsd >= 1_000_000
              ? `$${(carbonValueUsd / 1_000_000).toFixed(1)}M`
              : `$${(carbonValueUsd / 1_000).toFixed(0)}K`}
            unit="est. @$15/t"
          />
          <MiniStat
            label="Annual seq."
            value={annualSeqTons >= 1000 ? `${(annualSeqTons / 1000).toFixed(1)}K` : String(annualSeqTons)}
            unit="tCO₂/yr"
          />
          <MiniStat
            label="EUDR status"
            value={eudr.status === 'compliant' ? 'Compliant' : eudr.status === 'at_risk' ? 'At risk' : 'Unknown'}
            valueClass={eudr.status === 'compliant' ? 'text-emerald-600' : eudr.status === 'at_risk' ? 'text-red-500' : 'text-[#374151]'}
          />
        </div>
      </div>

      {/* Exit liquidity & logistics */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Banknote className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Exit &amp; Liquidity</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MiniStat
            label="Exit liquidity"
            value={liquidity.label}
            valueClass={liquidity.color}
          />
          <MiniStat
            label="Nearest port"
            value={nearestPort.distanceKm < 1000 ? `${nearestPort.distanceKm} km` : '>1000 km'}
            unit={nearestPort.name.replace(' Port', '')}
          />
          <MiniStat label="Road quality" value={roadLabel} />
          <MiniStat
            label="Market access"
            value={`${suitability.marketAccess}/100`}
            valueClass={suitability.marketAccess >= 65 ? 'text-emerald-600' : suitability.marketAccess >= 45 ? 'text-orange-500' : 'text-red-500'}
          />
        </div>
      </div>

      {/* Score breakdown mini bar */}
      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart2 className="w-3.5 h-3.5 text-[#6b7280]" />
          <span className="text-[11px] font-semibold text-[#1f2937] uppercase tracking-wider">Due-Diligence Factors</span>
        </div>
        <div className="space-y-1.5">
          {([
            ['Soil quality',      suitability.soilQuality],
            ['Water access',      suitability.waterAccess],
            ['Climate',           suitability.climate],
            ['Regulatory safety', suitability.regulatorySafety],
          ] as [string, number][]).map(([label, val]) => (
            <ScoreBar key={label} label={label} value={val} />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-[#6b7280] leading-relaxed px-0.5">
        Carbon estimates are indicative (voluntary market, REDD+ methodology). Engage a certified
        verifier for CORSIA/Gold Standard issuance. Risk grades reflect on-the-ground data
        completeness of {Math.round(assessment.dataCompleteness * 100)}%.
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
