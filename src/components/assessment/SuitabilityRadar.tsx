'use client';

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { SuitabilityScores } from '@/types/assessment';

interface Props {
  scores: SuitabilityScores;
}

const DIMENSIONS: { key: keyof SuitabilityScores; label: string; short: string }[] = [
  { key: 'soilQuality',      label: 'Soil',       short: 'Soil' },
  { key: 'waterAccess',      label: 'Water',      short: 'Water' },
  { key: 'climate',          label: 'Climate',    short: 'Climate' },
  { key: 'marketAccess',     label: 'Market',     short: 'Market' },
  { key: 'regulatorySafety', label: 'Regulatory', short: 'Regul.' },
  { key: 'vegetationHealth', label: 'Vegetation', short: 'Veget.' },
];

export default function SuitabilityRadar({ scores }: Props) {
  const data = DIMENSIONS.map((d) => ({
    dimension: d.label,
    value: scores[d.key],
  }));

  return (
    <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02] animate-fade-in">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs text-gray-300 font-semibold uppercase tracking-wider">
          Suitability Profile
        </h4>
        <span className="text-[10px] text-gray-500">scores 0–100</span>
      </div>

      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 0, left: 30 }} outerRadius="70%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: '#a3a3a3', fontSize: 11 }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#00dc82"
              fill="#00dc82"
              fillOpacity={0.32}
              dot={{ r: 2.5, fill: '#00dc82' }}
              isAnimationActive
              animationDuration={600}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,14,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
                color: '#e0e0e0',
              }}
              formatter={(v) => [`${v ?? '–'}/100`, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mt-1">
        {DIMENSIONS.map((d) => {
          const v = scores[d.key];
          const color = v >= 75 ? 'text-emerald-400' : v >= 50 ? 'text-yellow-400' : v >= 35 ? 'text-orange-400' : 'text-red-400';
          return (
            <div key={d.key} className="rounded-md bg-white/[0.03] px-2 py-1.5 border border-white/[0.04]">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{d.short}</div>
              <div className={`text-sm font-bold font-mono ${color}`}>{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
