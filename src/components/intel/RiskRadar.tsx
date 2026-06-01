'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RiskItem } from '@/types/intel';

interface RiskRadarProps {
  risks: RiskItem[];
}

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

const TREND_COLOR = {
  up: 'text-red-500',
  down: 'text-green-600',
  flat: 'text-[#9ca3af]',
} as const;

function scoreColor(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 45) return '#f59e0b';
  return '#35b779';
}

/** Shorten long risk labels so the radar axis stays legible. */
function shortLabel(label: string): string {
  return label.length > 18 ? label.slice(0, 16) + '…' : label;
}

export default function RiskRadar({ risks }: RiskRadarProps) {
  if (!risks.length) return null;

  const data = risks.map((r) => ({ label: shortLabel(r.label), full: r.label, score: r.score }));

  return (
    <div className="rounded-xl border border-[#35b779]/[0.15] bg-[#faf8f3]/60 p-3">
      <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider mb-1">Risk radar</h4>
      <p className="text-[11px] text-[#6b7280] mb-2">Scored 0–100 for your profile. Higher = more exposure.</p>

      {/* Explicit height — ResponsiveContainer needs a sized parent. */}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="#35b779" strokeOpacity={0.18} />
            <PolarAngleAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#374151' }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} />
            <Radar
              name="Risk"
              dataKey="score"
              stroke="#35b779"
              fill="#35b779"
              fillOpacity={0.35}
              isAnimationActive
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend / detail list */}
      <div className="space-y-1.5 mt-1">
        {risks.map((r) => {
          const TrendIcon = TREND_ICON[r.trend];
          return (
            <div key={r.label} className="flex items-start gap-2">
              <span
                className="mt-1 w-2 h-2 rounded-full shrink-0"
                style={{ background: scoreColor(r.score) }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#1f2937] truncate">{r.label}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <TrendIcon className={`w-3 h-3 ${TREND_COLOR[r.trend]}`} />
                    <span
                      className="text-[11px] font-mono font-bold"
                      style={{ color: scoreColor(r.score) }}
                    >
                      {r.score}
                    </span>
                  </span>
                </div>
                {r.rationale && <p className="text-[10px] text-[#6b7280] leading-snug">{r.rationale}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
