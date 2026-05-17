'use client';

import { useMemo } from 'react';
import { X, MapPin, TreePine, TrendingDown, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

interface ProvinceDetailProps {
  provinceId: string;
  year: number;
  onClose: () => void;
}

const DATA_YEARS = [2000, 2005, 2010, 2015, 2020, 2024];

function Sparkline({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return (
          <circle key={i} cx={x} cy={y} r="2" fill={color} opacity={i === data.length - 1 ? 1 : 0.4} />
        );
      })}
    </svg>
  );
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

const EUDR_COMMODITIES = ['coffee', 'rubber', 'timber', 'shrimp'];

export default function ProvinceDetail({ provinceId, year, onClose }: ProvinceDetailProps) {
  const province = useMemo(() => provinces.find((p) => p.id === provinceId), [provinceId]);

  const stats = useMemo(() => {
    if (!province) return null;

    const coverData = DATA_YEARS.map((y) => interpolateYear(province.forestCover, y));
    const lossData = DATA_YEARS.map((y) => interpolateYear(province.forestLoss, y));
    const rateData = DATA_YEARS.map((y) => interpolateYear(province.lossRate, y));

    const currentCover = interpolateYear(province.forestCover, year);
    const currentLoss = interpolateYear(province.forestLoss, year);
    const currentRate = interpolateYear(province.lossRate, year);
    const cover2000 = interpolateYear(province.forestCover, 2000);
    const coverChange = cover2000 > 0 ? ((currentCover - cover2000) / cover2000) * 100 : 0;

    const coverPct = ((currentCover / (province.area * 100)) * 100).toFixed(1);

    const isEUDR = EUDR_COMMODITIES.includes(province.primaryCrop);
    const riskLevel: 'critical' | 'elevated' | 'moderate' | 'low' =
      currentRate >= 0.02 ? 'critical' : currentRate >= 0.01 ? 'elevated' : currentRate >= 0.005 ? 'moderate' : 'low';

    return {
      coverData,
      lossData,
      rateData,
      currentCover,
      currentLoss,
      currentRate,
      coverChange,
      coverPct,
      isEUDR,
      riskLevel,
    };
  }, [province, year]);

  if (!province || !stats) return null;

  const riskColors = {
    critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
    elevated: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    moderate: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    low: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  };
  const rc = riskColors[stats.riskLevel];

  return (
    <div className="absolute top-3 left-[292px] w-[300px] z-30 glass-panel rounded-xl border border-white/[0.08] shadow-2xl animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2 border-b border-white/[0.06]">
        <div>
          <h3 className="text-sm font-bold text-white">{province.name}</h3>
          <p className="text-[10px] text-gray-500">{province.nameVi}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-300">
              {province.region}
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${rc.bg} ${rc.text} ${rc.border}`}>
              {stats.riskLevel} risk
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick stats */}
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <MapPin className="w-3 h-3" />
          {province.lat.toFixed(2)}°N, {province.lng.toFixed(2)}°E
          <span className="mx-0.5">·</span>
          {province.area.toLocaleString()} km²
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="stat-card !p-2">
            <div className="flex items-center gap-1 mb-1">
              <TreePine className="w-3 h-3 text-green-400" />
              <span className="text-[8px] text-gray-500 uppercase">Cover</span>
            </div>
            <div className="text-xs font-bold text-white font-mono">{formatNum(stats.currentCover)}</div>
            <div className="text-[8px] text-gray-500">{stats.coverPct}% of area</div>
          </div>
          <div className="stat-card !p-2">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3 text-orange-400" />
              <span className="text-[8px] text-gray-500 uppercase">Loss/yr</span>
            </div>
            <div className="text-xs font-bold text-orange-400 font-mono">{formatNum(stats.currentLoss)}</div>
            <div className="text-[8px] text-gray-500">{(stats.currentRate * 100).toFixed(2)}%</div>
          </div>
          <div className="stat-card !p-2">
            <div className="flex items-center gap-1 mb-1">
              {stats.coverChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[8px] text-gray-500 uppercase">Since 00</span>
            </div>
            <div
              className={`text-xs font-bold font-mono ${stats.coverChange >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {stats.coverChange >= 0 ? '+' : ''}
              {stats.coverChange.toFixed(1)}%
            </div>
            <div className="text-[8px] text-gray-500">cover change</div>
          </div>
        </div>

        {/* Sparklines */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-gray-400">Forest Cover (ha)</span>
              <span className="text-[9px] text-gray-600 font-mono">
                {DATA_YEARS[0]}–{DATA_YEARS[DATA_YEARS.length - 1]}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.03]">
              <Sparkline data={stats.coverData} color="#4ade80" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-gray-400">Annual Loss (ha)</span>
              <span className="text-[9px] text-gray-600 font-mono">
                {DATA_YEARS[0]}–{DATA_YEARS[DATA_YEARS.length - 1]}
              </span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.03]">
              <Sparkline data={stats.lossData} color="#fb923c" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-gray-400">Loss Rate (%)</span>
            </div>
            <div className="p-2 rounded-md bg-white/[0.03]">
              <Sparkline data={stats.rateData.map((r) => r * 100)} color="#f87171" />
            </div>
          </div>
        </div>

        {/* EUDR flag */}
        {stats.isEUDR && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
            <Package className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-amber-400">EUDR-Regulated Commodity</div>
              <p className="text-[9px] text-gray-400 mt-0.5">
                Primary crop: <span className="text-white capitalize">{province.primaryCrop}</span>.
                Supply chains from this province may require enhanced due diligence under EU
                Regulation 2023/1115.
              </p>
            </div>
          </div>
        )}

        {/* Risk warning */}
        {stats.riskLevel === 'critical' && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/[0.06] border border-red-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-[9px] text-gray-400">
              This province exceeds the 2% annual loss threshold. Satellite monitoring and
              ground-truth surveys are strongly recommended before sourcing commodities.
            </p>
          </div>
        )}

        {/* Year-over-year table */}
        <div>
          <h4 className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Year-by-Year Data</h4>
          <div className="rounded-md border border-white/[0.06] overflow-hidden">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="text-left text-gray-500 font-medium px-2 py-1">Year</th>
                  <th className="text-right text-gray-500 font-medium px-2 py-1">Cover (ha)</th>
                  <th className="text-right text-gray-500 font-medium px-2 py-1">Loss (ha)</th>
                  <th className="text-right text-gray-500 font-medium px-2 py-1">Rate</th>
                </tr>
              </thead>
              <tbody>
                {DATA_YEARS.map((y) => (
                  <tr
                    key={y}
                    className={`border-t border-white/[0.04] ${y === year ? 'bg-accent/[0.06]' : ''}`}
                  >
                    <td className={`px-2 py-1 font-mono ${y === year ? 'text-accent font-bold' : 'text-gray-400'}`}>
                      {y}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-white">
                      {formatNum(interpolateYear(province.forestCover, y))}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-orange-400">
                      {formatNum(interpolateYear(province.forestLoss, y))}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-red-400">
                      {(interpolateYear(province.lossRate, y) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
