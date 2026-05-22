'use client';

import { FlaskConical, Sprout, Layers } from 'lucide-react';
import type { SoilData } from '@/types/assessment';

interface Props {
  soil: SoilData | null;
  source?: string;
  bare?: boolean;
}

export default function SoilProfile({ soil, source, bare = false }: Props) {
  if (!soil) {
    if (bare) return <p className="text-[11px] text-[#6b7280]">Soil data unavailable.</p>;
    return (
      <div className="rounded-xl p-3 border border-[#35b779]/[0.15] bg-white/60 shadow-sm">
        <div className="text-xs text-[#1f2937] font-semibold uppercase tracking-wider mb-1">
          Soil Profile
        </div>
        <p className="text-[11px] text-[#6b7280]">Soil data unavailable.</p>
      </div>
    );
  }

  const phLabel =
    soil.pH < 5.0 ? 'Strongly acidic' :
    soil.pH < 5.5 ? 'Acidic' :
    soil.pH <= 7.0 ? 'Near neutral' :
    soil.pH <= 7.5 ? 'Slightly alkaline' : 'Alkaline';

  const phColor =
    soil.pH < 5.0 ? 'text-orange-400' :
    soil.pH < 5.5 ? 'text-yellow-500' :
    soil.pH <= 7.0 ? 'text-emerald-500' :
    soil.pH <= 7.5 ? 'text-yellow-500' : 'text-orange-400';

  const sand = Math.max(0, Math.min(100, soil.sand));
  const silt = Math.max(0, Math.min(100, soil.silt));
  const clay = Math.max(0, Math.min(100, soil.clay));

  const body = (
    <>
      <div className="rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.10] px-2.5 py-2 mb-2">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Layers className="w-3 h-3 text-amber-500" />
          <span className="text-xs font-bold text-[#111827]">{soil.type}</span>
          <span className="text-[10px] text-[#6b7280]">({soil.textureClass})</span>
        </div>
        <p className="text-[11px] text-[#374151] leading-snug">{soil.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <Metric
          icon={<FlaskConical className="w-3 h-3 text-pink-400" />}
          label="pH"
          value={soil.pH.toFixed(1)}
          sub={phLabel}
          valueClass={phColor}
        />
        <Metric
          icon={<Sprout className="w-3 h-3 text-green-500" />}
          label="Organic C"
          value={`${soil.organicCarbon.toFixed(1)} g/kg`}
          sub={soil.organicCarbon >= 20 ? 'Rich' : soil.organicCarbon >= 10 ? 'Moderate' : 'Low'}
        />
        <Metric
          label="CEC"
          value={`${soil.cec.toFixed(1)} cmol/kg`}
          sub={soil.cec >= 20 ? 'High retention' : soil.cec >= 10 ? 'Moderate' : 'Low'}
        />
        <Metric
          label="Nitrogen"
          value={`${soil.nitrogen.toFixed(2)} g/kg`}
        />
      </div>

      <div className="mb-2">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Texture</span>
          <span className="text-[10px] text-[#9ca3af] font-mono">
            {sand.toFixed(0)} / {silt.toFixed(0)} / {clay.toFixed(0)}
          </span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden border border-[#35b779]/[0.15]" aria-label={`Sand ${sand.toFixed(0)}%, silt ${silt.toFixed(0)}%, clay ${clay.toFixed(0)}%`}>
          <div className="bg-amber-300/80" style={{ width: `${sand}%` }} title={`Sand ${sand.toFixed(0)}%`} />
          <div className="bg-stone-400/70" style={{ width: `${silt}%` }} title={`Silt ${silt.toFixed(0)}%`} />
          <div className="bg-orange-600/70" style={{ width: `${clay}%` }} title={`Clay ${clay.toFixed(0)}%`} />
        </div>
        <div className="flex justify-between text-[10px] text-[#6b7280] mt-1">
          <span>Sand</span><span>Silt</span><span>Clay</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Mini label="Field Cap." value={soil.waterRetention.fieldCapacity.toFixed(2)} />
        <Mini label="Wilting Pt." value={soil.waterRetention.wiltingPoint.toFixed(2)} />
        <Mini label="Plant Avail." value={soil.waterRetention.availableWater.toFixed(2)} highlight />
      </div>
      <div className="text-[10px] text-[#6b7280] mt-1 text-right">cm³/cm³</div>
    </>
  );

  if (bare) return body;

  return (
    <div className="rounded-xl p-3 border border-[#35b779]/[0.15] bg-white/60 shadow-sm animate-fade-in">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs text-[#1f2937] font-semibold uppercase tracking-wider">
          Soil Profile
        </h4>
        {source && <span className="text-[10px] text-[#9ca3af] truncate">{source}</span>}
      </div>
      {body}
    </div>
  );
}

function Metric({
  icon, label, value, sub, valueClass = 'text-[#111827]',
}: { icon?: React.ReactNode; label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.10] px-2 py-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className={`text-sm font-bold font-mono leading-tight ${valueClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#6b7280]">{sub}</div>}
    </div>
  );
}

function Mini({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md px-2 py-1.5 border ${highlight ? 'bg-accent/[0.08] border-accent/25' : 'bg-[#35b779]/[0.05] border-[#35b779]/[0.10]'}`}>
      <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">{label}</div>
      <div className={`text-xs font-bold font-mono ${highlight ? 'text-accent' : 'text-[#111827]'}`}>{value}</div>
    </div>
  );
}
