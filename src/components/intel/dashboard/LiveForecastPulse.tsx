'use client';

import { useEffect, useState } from 'react';
import { Flame, TrendingDown, TrendingUp, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
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
  return `${Math.floor(m / 60)}h ago`;
}

/** Per-province risk tier from its 0–100 score. */
function chipTone(score: number): string {
  if (score >= 60) return 'bg-red-500/10 text-red-700 border-red-500/25';
  if (score >= 45) return 'bg-amber-500/10 text-amber-700 border-amber-500/25';
  return 'bg-green-500/10 text-green-700 border-green-600/20';
}

export default function LiveForecastPulse({ profile, year }: LiveForecastPulseProps) {
  const { pulse, loading, error, lastUpdated } = useForecastPulse(profile, year);

  // Re-render the "updated Ns ago" label every 15s without refetching.
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  if (loading && !pulse) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-accent/20 bg-accent/[0.04] px-3 py-2 animate-pulse">
        <div className="w-7 h-7 rounded-lg bg-accent/15 shrink-0" />
        <div className="h-3 w-48 bg-accent/15 rounded" />
      </div>
    );
  }

  if (error && !pulse) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <p className="text-[11px] text-[#6b7280]">Live pulse unavailable — {error}</p>
      </div>
    );
  }

  if (!pulse) return null;

  const { forecast: f, national, fires, topRisks, scope } = pulse;

  // ── derive the verdict ──────────────────────────────────────────────
  const danger = topRisks.filter((r) => r.score >= 60).slice(0, 3);
  const watch = topRisks.filter((r) => r.score >= 45 && r.score < 60).slice(0, 3);
  const flagged = danger.length > 0 ? danger : watch;
  const fireHot = fires.available ? fires.top.slice(0, 2) : [];
  const areaWord = scope === 'province' ? 'sourcing area' : 'region';

  type Tier = 'critical' | 'watch' | 'calm';
  const tier: Tier = danger.length > 0 ? 'critical' : watch.length > 0 || national.highRiskCount > 0 ? 'watch' : 'calm';

  const TIER = {
    critical: { Icon: ShieldAlert, text: 'text-red-700', ring: 'border-red-500/30 bg-red-500/[0.05]', badge: 'bg-red-500/12 text-red-600' },
    watch: { Icon: AlertTriangle, text: 'text-amber-700', ring: 'border-amber-500/30 bg-amber-500/[0.05]', badge: 'bg-amber-500/12 text-amber-600' },
    calm: { Icon: ShieldCheck, text: 'text-green-700', ring: 'border-green-600/25 bg-green-500/[0.04]', badge: 'bg-green-500/12 text-green-700' },
  }[tier];

  const headline =
    tier === 'critical'
      ? `${danger.length} ${areaWord}${danger.length > 1 ? 's' : ''} in danger`
      : tier === 'watch'
        ? `${(watch.length || national.highRiskCount)} ${areaWord}${(watch.length || national.highRiskCount) > 1 ? 's' : ''} under watch`
        : `All ${areaWord}s stable`;

  const declining = f.changePct2030 < 0;
  const stable2030 = Math.abs(f.changePct2030) < 1;
  const TrendIcon = stable2030 ? null : declining ? TrendingDown : TrendingUp;

  return (
    <div className={`rounded-xl border ${TIER.ring} px-3 py-2`}>
      <div className="flex items-center gap-3">
        {/* Severity icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TIER.badge}`}>
          <TIER.Icon className="w-4 h-4" />
        </div>

        {/* Verdict + danger chips */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className={`text-sm font-bold leading-none ${TIER.text}`}>{headline}</span>
            {fireHot.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-full px-1.5 py-0.5">
                <Flame className="w-2.5 h-2.5" />
                {fires.count} fires · {fireHot.map((p) => p.name).join(', ')}
              </span>
            )}
          </div>

          {/* Named areas as risk chips */}
          {flagged.length > 0 ? (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {flagged.map((r) => (
                <span
                  key={r.id}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-md border px-1.5 py-0.5 ${chipTone(r.score)}`}
                >
                  {r.name}
                  <span className="font-mono opacity-70">{r.lossRatePct}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[#9ca3af] mt-1 leading-none">No areas above the 1.5%/yr loss threshold.</p>
          )}
        </div>

        {/* Tiny muted stats + freshness */}
        <div className="text-right shrink-0 hidden sm:block">
          <div className="flex items-center justify-end gap-2 text-[10px] text-[#6b7280]">
            <span className="inline-flex items-center gap-0.5">
              {TrendIcon && <TrendIcon className={`w-2.5 h-2.5 ${declining ? 'text-red-500' : 'text-green-600'}`} />}
              2030 {f.changePct2030 >= 0 ? '+' : ''}{f.changePct2030.toFixed(1)}%
            </span>
            <span className="text-[#d1d5db]">·</span>
            <span>{(national.avgLossRate * 100).toFixed(2)}%/yr</span>
          </div>
          <div className="text-[9px] text-[#9ca3af] mt-1 uppercase tracking-wider">Updated {relativeTime(lastUpdated)}</div>
        </div>
      </div>
    </div>
  );
}
