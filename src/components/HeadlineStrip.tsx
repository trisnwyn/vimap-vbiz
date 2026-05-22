'use client';

import { useMemo } from 'react';
import { TreePine, TrendingDown, AlertTriangle, Leaf } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

interface HeadlineStripProps {
  year: number;
}

export default function HeadlineStrip({ year }: HeadlineStripProps) {
  const stats = useMemo(() => {
    const totalForest = provinces.reduce(
      (s, p) => s + interpolateYear(p.forestCover, year), 0,
    );
    const totalLoss = provinces.reduce(
      (s, p) => s + interpolateYear(p.forestLoss, year), 0,
    );
    const highRisk = provinces.filter(
      (p) => interpolateYear(p.lossRate, year) >= 0.015,
    ).length;
    const coverPct = ((totalForest / 33121000) * 100).toFixed(1); // Vietnam land area ha
    return { totalForest, totalLoss, highRisk, coverPct };
  }, [year]);

  const items = [
    {
      icon: TreePine,
      iconColor: 'text-green-400',
      value: (stats.totalForest / 1_000_000).toFixed(2) + 'M ha',
      label: 'Total Forest Cover',
      sub: `${stats.coverPct}% of land area`,
    },
    {
      icon: TrendingDown,
      iconColor: 'text-orange-400',
      value: (stats.totalLoss / 1_000).toFixed(1) + 'K ha',
      label: 'Annual Forest Loss',
      sub: year >= 2021 ? 'post-EUDR cutoff' : 'pre-EUDR period',
    },
    {
      icon: AlertTriangle,
      iconColor: 'text-red-400',
      value: stats.highRisk.toString(),
      label: 'High-Risk Provinces',
      sub: 'loss rate > 1.5%/yr',
    },
    {
      icon: Leaf,
      iconColor: 'text-accent',
      value: '€2.3B',
      label: 'EU Trade Exposure',
      sub: 'coffee · rubber · timber',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-px bg-white/[0.04] border-b border-white/[0.06]">
      {items.map(({ icon: Icon, iconColor, value, label, sub }) => (
        <div
          key={label}
          className="flex items-center gap-3 px-4 py-2.5 bg-background hover:bg-white/[0.02] transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <div className="text-base font-bold font-mono text-white leading-none">{value}</div>
            <div className="text-xs text-gray-400 mt-0.5 leading-none">{label}</div>
            <div className="text-[11px] text-gray-600 leading-none mt-0.5">{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
