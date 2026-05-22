'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { provinces } from '@/data/provinces';

interface ForestLossChartProps {
  selectedProvince: string | null;
}

const YEARS = [2000, 2005, 2010, 2015, 2020, 2024] as const;

export default function ForestLossChart({ selectedProvince }: ForestLossChartProps) {
  const data = useMemo(() => {
    const source = selectedProvince
      ? provinces.filter((p) => p.id === selectedProvince)
      : provinces;

    return YEARS.map((year) => ({
      year: year.toString(),
      forestCover: Math.round(
        source.reduce((sum, p) => sum + (p.forestCover[year] ?? 0), 0) / 1000,
      ),
      forestLoss: Math.round(
        source.reduce((sum, p) => sum + (p.forestLoss[year] ?? 0), 0) / 1000,
      ),
    }));
  }, [selectedProvince]);

  return (
    <div className="w-full" style={{ minHeight: 180 }}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(53,183,121,0.12)" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#374151', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(53,183,121,0.18)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#374151', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}M` : `${v}K`}
            width={46}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(250,248,243,0.95)',
              border: '1px solid rgba(53,183,121,0.2)',
              borderRadius: 8,
              fontSize: 11,
              color: '#111827',
            }}
            formatter={(value, name) => [
              `${Number(value).toLocaleString()}K ha`,
              name === 'forestCover' ? 'Forest Cover' : 'Annual Loss',
            ]}
          />
          <ReferenceLine
            x="2024"
            stroke="#c0392b"
            strokeDasharray="3 3"
            label={{
              value: 'EUDR',
              position: 'top',
              fill: '#c0392b',
              fontSize: 11,
            }}
          />
          <Bar
            dataKey="forestCover"
            fill="#35b779"
            radius={[4, 4, 0, 0]}
            name="Forest Cover"
          />
          <Bar
            dataKey="forestLoss"
            fill="#ff6b35"
            radius={[4, 4, 0, 0]}
            name="Annual Loss"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
