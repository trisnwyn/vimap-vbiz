'use client';

import { Wheat } from 'lucide-react';
import type { CropRecommendation } from '@/types/assessment';

interface Props {
  crops: CropRecommendation[];
  bare?: boolean;
}

const CATEGORY_META = {
  primary:   { label: 'PRIMARY',   chip: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  secondary: { label: 'SECONDARY', chip: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  marginal:  { label: 'MARGINAL',  chip: 'bg-orange-500/15 text-orange-500 border-orange-500/30' },
} as const;

const DEMAND_META = {
  high:   { label: 'High demand',   color: 'text-emerald-600' },
  medium: { label: 'Medium demand', color: 'text-yellow-600' },
  low:    { label: 'Low demand',    color: 'text-[#6b7280]' },
} as const;

export default function CropViability({ crops, bare = false }: Props) {
  if (crops.length === 0) {
    if (bare) return <p className="text-[11px] text-[#6b7280]">No crop fits to display.</p>;
    return (
      <div className="rounded-xl p-3 border border-[#35b779]/[0.15] bg-white/60 shadow-sm">
        <h4 className="text-xs text-[#1f2937] font-semibold uppercase tracking-wider">Crop Viability</h4>
        <p className="text-[11px] text-[#6b7280] mt-1">No crop fits to display.</p>
      </div>
    );
  }

  const list = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
      {crops.map((c, i) => {
        const cat = CATEGORY_META[c.category];
        const dem = DEMAND_META[c.marketDemand];
        const fillColor = c.suitability >= 75 ? '#16a34a' : c.suitability >= 50 ? '#ca8a04' : '#ea580c';

        return (
          <div
            key={c.name}
            className="rounded-md bg-[#35b779]/[0.05] border border-[#35b779]/[0.10] p-2 hover:border-[#35b779]/[0.20] transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate">
                  {c.name}
                  <span className="text-[10px] text-[#6b7280] font-normal ml-1.5">{c.nameVi}</span>
                </div>
                <div className="text-[10px] text-[#6b7280] flex items-center gap-2 mt-0.5">
                  <span className={`inline-block px-1 py-px rounded border text-[10px] font-bold ${cat.chip}`}>
                    {cat.label}
                  </span>
                  <span className={dem.color}>{dem.label}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono" style={{ color: fillColor }}>
                  {c.suitability}
                </div>
                <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">fit</div>
              </div>
            </div>

            <div className="h-1 rounded-full bg-[#35b779]/[0.08] overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full"
                style={{ width: `${c.suitability}%`, backgroundColor: fillColor, transition: 'width 0.6s ease-out' }}
              />
            </div>

            <ul className="text-[10px] text-[#374151] leading-snug space-y-0.5 pl-3 list-disc marker:text-[#9ca3af]">
              {c.reasons.slice(0, 2).map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
            {c.yieldEstimate && (
              <div className="text-[10px] text-[#6b7280] mt-1">
                Expected yield: <span className="text-[#1f2937] font-mono">{c.yieldEstimate}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (bare) return list;

  return (
    <div className="rounded-xl p-3 border border-[#35b779]/[0.15] bg-white/60 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs text-[#1f2937] font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Wheat className="w-3 h-3 text-amber-500" />
          Crop Viability
        </h4>
        <span className="text-[10px] text-[#9ca3af]">top {crops.length}</span>
      </div>
      {list}
    </div>
  );
}
