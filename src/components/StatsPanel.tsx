'use client';

import { useMemo } from 'react';
import { TreePine, TrendingDown, MapPin, AlertTriangle } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';
import ForestLossChart from './ForestLossChart';
import RegionChart from './RegionChart';

interface StatsPanelProps {
  year: number;
  selectedProvince: string | null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function StatsPanel({ year, selectedProvince }: StatsPanelProps) {
  const stats = useMemo(() => {
    const source = selectedProvince
      ? provinces.filter((p) => p.id === selectedProvince)
      : provinces;

    const totalForest = source.reduce(
      (sum, p) => sum + interpolateYear(p.forestCover, year),
      0,
    );
    const totalLoss = source.reduce(
      (sum, p) => sum + interpolateYear(p.forestLoss, year),
      0,
    );
    const avgLossRate =
      source.reduce((sum, p) => sum + interpolateYear(p.lossRate, year), 0) / source.length;

    const highRisk = source.filter(
      (p) => interpolateYear(p.lossRate, year) >= 0.015,
    );

    return { totalForest, totalLoss, avgLossRate, highRisk, count: source.length };
  }, [year, selectedProvince]);

  const selected = selectedProvince
    ? provinces.find((p) => p.id === selectedProvince)
    : null;

  return (
    <div className="h-full flex flex-col gap-3 p-3 overflow-y-auto">
      {selected && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">{selected.name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
              {selected.region}
            </span>
          </div>
          <div className="text-[10px] text-gray-500 flex items-center gap-2 mb-3">
            <MapPin className="w-3 h-3" />
            {selected.lat.toFixed(2)}°N, {selected.lng.toFixed(2)}°E
            <span className="mx-1">·</span>
            Primary: {selected.primaryCrop}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="stat-card animate-fade-in">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TreePine className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Forest Cover</span>
          </div>
          <div className="text-lg font-bold text-white font-mono animate-count">
            {formatNum(stats.totalForest)}
          </div>
          <div className="text-[10px] text-gray-500">hectares</div>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Annual Loss</span>
          </div>
          <div className="text-lg font-bold text-orange-400 font-mono animate-count">
            {formatNum(stats.totalLoss)}
          </div>
          <div className="text-[10px] text-gray-500">ha / year</div>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Loss Rate</span>
          </div>
          <div className="text-lg font-bold text-yellow-300 font-mono animate-count">
            {(stats.avgLossRate * 100).toFixed(2)}%
          </div>
          <div className="text-[10px] text-gray-500">avg. annual</div>
        </div>

        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">High Risk</span>
          </div>
          <div className="text-lg font-bold text-red-400 font-mono animate-count">
            {stats.highRisk.length}
          </div>
          <div className="text-[10px] text-gray-500">
            province{stats.highRisk.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="mt-1">
        <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
          Forest Loss Trend
        </h4>
        <ForestLossChart selectedProvince={selectedProvince} />
      </div>

      {!selectedProvince && <RegionChart year={year} />}

      {stats.highRisk.length > 0 && (
        <div className="mt-1">
          <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
            High-Risk Provinces ({year})
          </h4>
          <div className="space-y-1">
            {stats.highRisk
              .sort(
                (a, b) =>
                  interpolateYear(b.lossRate, year) -
                  interpolateYear(a.lossRate, year),
              )
              .slice(0, 8)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <div>
                    <span className="text-xs text-white">{p.name}</span>
                    <span className="text-[10px] text-gray-500 ml-1.5">{p.primaryCrop}</span>
                  </div>
                  <span className="text-[10px] font-mono text-red-400 font-bold">
                    {(interpolateYear(p.lossRate, year) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
