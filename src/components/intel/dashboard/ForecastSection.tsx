'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus, Activity } from 'lucide-react';
import { getForecastSummary } from '@/lib/intel/forecast';
import ForestLossChart from '@/components/ForestLossChart';
import RegionChart from '@/components/RegionChart';

interface ForecastSectionProps {
  year: number;
  selectedProvince: string | null;
}

function scoreColor(score: number): string {
  if (score >= 60) return 'text-red-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-green-700';
}
function scoreBar(score: number): string {
  if (score >= 60) return 'bg-red-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-green-600';
}

export default function ForecastSection({ year, selectedProvince }: ForecastSectionProps) {
  const f = useMemo(() => getForecastSummary(year, selectedProvince), [year, selectedProvince]);

  const declining = f.changePct2030 < 0;
  const stable = Math.abs(f.changePct2030) < 1;
  const TrendIcon = stable ? Minus : declining ? TrendingDown : TrendingUp;
  const trendColor = stable ? 'text-[#6b7280]' : declining ? 'text-red-600' : 'text-green-700';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-accent" />
        <h3 className="text-xs font-bold text-[#374151] uppercase tracking-wider">
          Statistical forecast — {f.scope === 'province' ? 'province' : 'national'}
        </h3>
      </div>

      {/* 2030 projection + headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-accent/20 bg-accent/[0.05] p-3">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">2030 projection</div>
          <div className={`flex items-center gap-1 text-lg font-bold ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            {f.changePct2030 >= 0 ? '+' : ''}{f.changePct2030.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">
            → {(f.forest2030 / 1_000_000).toFixed(2)}M ha forest
          </div>
        </div>

        <div className="rounded-xl border border-[#35b779]/[0.15] bg-white/55 p-3">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">Forest now ({year})</div>
          <div className="text-lg font-bold text-[#111827]">{(f.forestNow / 1_000_000).toFixed(2)}M</div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">hectares</div>
        </div>

        <div className="rounded-xl border border-[#35b779]/[0.15] bg-white/55 p-3">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">Loss in {year}</div>
          <div className="text-lg font-bold text-[#111827]">{(f.totalLoss / 1000).toFixed(1)}K</div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">ha lost</div>
        </div>

        <div className="rounded-xl border border-[#35b779]/[0.15] bg-white/55 p-3">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">Avg loss rate</div>
          <div className="text-lg font-bold text-[#111827]">{(f.avgLossRate * 100).toFixed(2)}%</div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">per year</div>
        </div>
      </div>

      {/* Risk scoreboard */}
      {f.topRisks.length > 0 && (
        <div>
          <h4 className="text-[11px] text-[#374151] uppercase tracking-wider mb-2">
            Risk scoreboard — {year}
          </h4>
          <div className="space-y-1">
            {f.topRisks.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#35b779]/[0.05]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreBar(p.score)}`} />
                  <span className="text-[12px] text-[#111827] truncate">{p.name}</span>
                  <span className="text-[11px] text-[#9ca3af] truncate">{p.region}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 rounded-full bg-[#35b779]/[0.10] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${scoreBar(p.score)}`}
                      style={{ width: `${p.score}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-bold min-w-[24px] text-right ${scoreColor(p.score)}`}>
                    {p.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#35b779]/[0.15] bg-white/55 p-3">
          <ForestLossChart selectedProvince={selectedProvince} />
        </div>
        <div className="rounded-xl border border-[#35b779]/[0.15] bg-white/55 p-3">
          <RegionChart year={year} />
        </div>
      </div>

      <p className="text-[10px] text-[#9ca3af] leading-snug">
        Projection uses ordinary least-squares regression on the 2000–2024 province series. Risk scores
        weight loss rate, cover trend, commodity exposure and region. Indicative, not a substitute for
        ground-truth verification.
      </p>
    </div>
  );
}
