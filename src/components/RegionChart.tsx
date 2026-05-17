'use client';

import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

interface RegionChartProps {
  year: number;
}

const REGIONS = [
  'Central Highlands',
  'Southeast',
  'Northwest',
  'North Central',
  'Northeast',
  'Mekong Delta',
];

export default function RegionChart({ year }: RegionChartProps) {
  const data = useMemo(() => {
    return REGIONS.map((region) => {
      const group = provinces.filter((p) => p.region === region);
      const avgRate =
        group.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / (group.length || 1);
      return {
        region: region === 'Central Highlands' ? 'C. Highlands' : region,
        lossRate: Math.round(avgRate * 1000 * 10) / 10,
      };
    });
  }, [year]);

  return (
    <div className="mt-1">
      <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
        Loss Rate by Region (‰/yr)
      </h4>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="region"
              tick={{ fill: '#777', fontSize: 9 }}
            />
            <Radar
              name="Loss Rate"
              dataKey="lossRate"
              stroke="#00dc82"
              fill="#00dc82"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(10,14,20,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
                color: '#e0e0e0',
              }}
              formatter={(v) => [`${Number(v)}‰/yr`, 'Loss Rate']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
