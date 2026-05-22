'use client';

import { ShieldCheck, ShieldAlert, ShieldQuestion, AlertTriangle } from 'lucide-react';
import type { LandAssessment } from '@/types/assessment';

interface Props {
  eudr: LandAssessment['eudr'];
  bare?: boolean;
}

const STATUS_META = {
  compliant: {
    label: 'LIKELY COMPLIANT',
    subtitle: 'No post-2020 forest loss detected',
    icon: ShieldCheck,
    color: 'text-green-300',
    bg: 'bg-green-500/[0.08]',
    border: 'border-green-500/25',
  },
  at_risk: {
    label: 'AT RISK',
    subtitle: 'Post-2020 disturbance — due diligence required',
    icon: ShieldAlert,
    color: 'text-red-300',
    bg: 'bg-red-500/[0.08]',
    border: 'border-red-500/25',
  },
  unknown: {
    label: 'UNKNOWN',
    subtitle: 'Insufficient data for determination',
    icon: ShieldQuestion,
    color: 'text-gray-300',
    bg: 'bg-white/[0.04]',
    border: 'border-white/10',
  },
} as const;

export default function EUDRSection({ eudr, bare = false }: Props) {
  const meta = STATUS_META[eudr.status];
  const Icon = meta.icon;
  const changeColor = eudr.changePercent < -1 ? 'text-red-400' : eudr.changePercent < 0 ? 'text-orange-400' : 'text-green-400';

  const body = (
    <>
      <div className="flex items-center gap-2.5 mb-3">
        <Icon className={`w-7 h-7 shrink-0 ${meta.color}`} aria-hidden="true" />
        <div>
          <div className={`text-sm font-bold ${meta.color}`}>{meta.label}</div>
          <div className="text-[11px] text-gray-400">{meta.subtitle}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <Mini label="Cover 2020" value={`${(eudr.forestCover2020 / 1000).toFixed(0)}K`} unit="ha" />
        <Mini label="Cover 2024" value={`${(eudr.forestCover2024 / 1000).toFixed(0)}K`} unit="ha" />
        <Mini
          label="Change"
          value={`${eudr.changePercent > 0 ? '+' : ''}${eudr.changePercent.toFixed(1)}%`}
          valueClass={changeColor}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="rounded-md bg-white/[0.04] border border-white/[0.04] px-2 py-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Nearby Loss</div>
          <div className="text-sm font-bold text-orange-300 font-mono">{eudr.nearbyLossPoints}</div>
          <div className="text-[10px] text-gray-500">events within 30 km</div>
        </div>
        <div className="rounded-md bg-white/[0.04] border border-white/[0.04] px-2 py-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Status</div>
          <div className={`text-sm font-bold ${meta.color}`}>{eudr.status.replace('_', ' ')}</div>
          <div className="text-[10px] text-gray-500">EU Reg. 2023/1115</div>
        </div>
      </div>

      {eudr.riskFactors.length > 0 && (
        <div className="space-y-1 mt-2">
          {eudr.riskFactors.map((rf, i) => (
            <div key={i} className="flex items-start gap-1.5 p-1.5 rounded-md bg-red-500/[0.05] border border-red-500/15">
              <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
              <span className="text-[11px] text-gray-300 leading-snug">{rf}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-500 leading-relaxed mt-2">
        Modeled assessment — cross-reference with MARD forestry data and high-resolution imagery
        before EUDR due-diligence filings.
      </p>
    </>
  );

  if (bare) return body;

  return (
    <div className={`rounded-xl border p-3 animate-fade-in ${meta.bg} ${meta.border}`}>
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs text-gray-300 font-semibold uppercase tracking-wider">
          EUDR Compliance
        </h4>
        <span className="text-[10px] text-gray-500">cutoff: 31 Dec 2020</span>
      </div>
      {body}
    </div>
  );
}

function Mini({ label, value, unit, valueClass = 'text-white' }: { label: string; value: string; unit?: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-white/[0.04] border border-white/[0.04] px-2 py-1.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{label}</div>
      <div className={`text-sm font-bold font-mono leading-tight ${valueClass}`}>{value}</div>
      {unit && <div className="text-[10px] text-gray-500">{unit}</div>}
    </div>
  );
}
