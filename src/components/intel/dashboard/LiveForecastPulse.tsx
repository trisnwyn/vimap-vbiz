'use client';

import { useEffect, useState } from 'react';
import { Flame, TrendingDown, TrendingUp, Minus, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { useForecastPulse } from '@/hooks/useForecastPulse';
import type { BusinessProfile } from '@/types/intel';

interface LiveForecastPulseProps {
  profile: BusinessProfile | null;
  year: number;
}

function relativeTime(ts: number | null): string {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/** Small ▲/▼ delta chip; renders nothing when there is no meaningful change. */
function Delta({ value, invertColor = false }: { value: number; invertColor?: boolean }) {
  if (!value || Math.abs(value) < 0.0001) return null;
  const up = value > 0;
  // For "bad" metrics (fires, loss) an increase is red; for "good" ones invert.
  const bad = invertColor ? !up : up;
  const color = bad ? 'text-red-500' : 'text-green-600';
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${color}`}>
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(value) >= 1 ? Math.abs(Math.round(value)) : Math.abs(value).toFixed(2)}
    </span>
  );
}

export default function LiveForecastPulse({ profile, year }: LiveForecastPulseProps) {
  const { pulse, prev, loading, error, lastUpdated } = useForecastPulse(profile, year);

  // Re-render the "updated Ns ago" label every 15s without refetching.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!profile) return null;

  if (loading && !pulse) {
    return (
      <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3 animate-pulse">
        <div className="h-3 w-24 bg-accent/15 rounded mb-3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-accent/[0.06]" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !pulse) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.07] border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <p className="text-[11px] text-[#6b7280]">Live pulse unavailable — {error}</p>
      </div>
    );
  }

  if (!pulse) return null;

  const { forecast: f, national, fires, topRisks } = pulse;
  const declining = f.changePct2030 < 0;
  const stable = Math.abs(f.changePct2030) < 1;
  const TrendIcon = stable ? Minus : declining ? TrendingDown : TrendingUp;
  const trendColor = stable ? 'text-[#6b7280]' : declining ? 'text-red-600' : 'text-green-700';

  const fireDelta = prev ? fires.count - prev.fires.count : 0;
  const lossDelta = prev ? (national.avgLossRate - prev.national.avgLossRate) * 100 : 0;
  const riskDelta = prev ? national.highRiskCount - prev.national.highRiskCount : 0;
  const topRisk = topRisks[0];

  return (
    <div className="rounded-xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] to-transparent p-3">
      {/* LIVE header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-[10px] font-bold text-accent uppercase tracking-[0.14em]">Live forecast</span>
        </div>
        <span className="text-[10px] text-[#9ca3af]">Updated {relativeTime(lastUpdated)}</span>
      </div>

      {/* Live metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 2030 projection */}
        <div className="rounded-lg border border-accent/20 bg-white/55 p-2.5">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">2030 outlook</div>
          <div className={`flex items-center gap-1 text-base font-bold ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {f.changePct2030 >= 0 ? '+' : ''}{f.changePct2030.toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">{(f.forest2030 / 1_000_000).toFixed(2)}M ha</div>
        </div>

        {/* Avg loss rate */}
        <div className="rounded-lg border border-[#35b779]/[0.15] bg-white/55 p-2.5">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">Avg loss rate</div>
          <div className="flex items-center gap-1.5 text-base font-bold text-[#111827]">
            {(national.avgLossRate * 100).toFixed(2)}%
            <Delta value={lossDelta} invertColor />
          </div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5">{national.scope === 'selection' ? 'your scope' : 'national'}</div>
        </div>

        {/* Active fires (live FIRMS) */}
        <div className="rounded-lg border border-orange-500/20 bg-white/55 p-2.5">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1 flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 text-orange-500" /> Active fires
          </div>
          {fires.available ? (
            <>
              <div className="flex items-center gap-1.5 text-base font-bold text-[#111827]">
                {fires.count}
                <Delta value={fireDelta} invertColor />
              </div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">last 48h</div>
            </>
          ) : (
            <>
              <div className="text-base font-bold text-[#d1d5db]">—</div>
              <div className="text-[10px] text-[#9ca3af] mt-0.5">unavailable</div>
            </>
          )}
        </div>

        {/* High-risk count */}
        <div className="rounded-lg border border-[#35b779]/[0.15] bg-white/55 p-2.5">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wide mb-1">High-risk areas</div>
          <div className="flex items-center gap-1.5 text-base font-bold text-[#111827]">
            {national.highRiskCount}
            <Delta value={riskDelta} invertColor />
          </div>
          <div className="text-[10px] text-[#9ca3af] mt-0.5 truncate">
            {topRisk ? `top: ${topRisk.name} (${topRisk.score})` : 'none flagged'}
          </div>
        </div>
      </div>
    </div>
  );
}
