'use client';

import { Wheat } from 'lucide-react';
import type { CropRecommendation } from '@/types/assessment';

interface Props {
  crops: CropRecommendation[];
  bare?: boolean;
}

const CATEGORY_META = {
  primary:   { label: 'PRIMARY',   chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  secondary: { label: 'SECONDARY', chip: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  marginal:  { label: 'MARGINAL',  chip: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
} as const;

const DEMAND_META = {
  high:   { label: 'High demand',   color: 'text-emerald-400' },
  medium: { label: 'Medium demand', color: 'text-yellow-400' },
  low:    { label: 'Low demand',    color: 'text-gray-400' },
} as const;

export default function CropViability({ crops, bare = false }: Props) {
  if (crops.length === 0) {
    if (bare) return <p className="text-[11px] text-gray-500">No crop fits to display.</p>;
    return (
      <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02]">
        <h4 className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Crop Viability</h4>
        <p className="text-[11px] text-gray-500 mt-1">No crop fits to display.</p>
      </div>
    );
  }

  const list = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {crops.map((c, i) => {
          const cat = CATEGORY_META[c.category];
          const dem = DEMAND_META[c.marketDemand];
          const fillColor = c.suitability >= 75 ? '#34d399' : c.suitability >= 50 ? '#eab308' : '#f97316';

          return (
            <div
              key={c.name}
              className="rounded-md bg-white/[0.03] border border-white/[0.04] p-2 hover:border-white/[0.1] transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {c.name}
                    <span className="text-[10px] text-gray-500 font-normal ml-1.5">{c.nameVi}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
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
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">fit</div>
                </div>
              </div>

              <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.suitability}%`, backgroundColor: fillColor, transition: 'width 0.6s ease-out' }}
                />
              </div>

              <ul className="text-[10px] text-gray-400 leading-snug space-y-0.5 pl-3 list-disc marker:text-gray-600">
                {c.reasons.slice(0, 2).map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
              {c.yieldEstimate && (
                <div className="text-[10px] text-gray-500 mt-1">
                  Expected yield: <span className="text-gray-300 font-mono">{c.yieldEstimate}</span>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );

  if (bare) return list;

  return (
    <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02] animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs text-gray-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Wheat className="w-3 h-3 text-amber-400" />
          Crop Viability
        </h4>
        <span className="text-[10px] text-gray-500">top {crops.length}</span>
      </div>
      {list}
    </div>
  );
}
