'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, ShieldOff } from 'lucide-react';
import type { LandAssessment } from '@/types/assessment';

interface Props {
  score: number;
  rating: LandAssessment['rating'];
  dataCompleteness: number;
}

const RATING_META: Record<LandAssessment['rating'], { label: string; color: string; bg: string; border: string; ring: string; icon: typeof TrendingUp }> = {
  excellent: { label: 'EXCELLENT',  color: 'text-emerald-300', bg: 'bg-emerald-500/[0.08]', border: 'border-emerald-500/30', ring: '#34d399', icon: TrendingUp },
  good:      { label: 'GOOD',       color: 'text-green-300',   bg: 'bg-green-500/[0.08]',   border: 'border-green-500/25',   ring: '#22c55e', icon: TrendingUp },
  moderate:  { label: 'MODERATE',   color: 'text-yellow-300',  bg: 'bg-yellow-500/[0.08]',  border: 'border-yellow-500/25',  ring: '#eab308', icon: Minus },
  poor:      { label: 'POOR',       color: 'text-orange-300',  bg: 'bg-orange-500/[0.08]',  border: 'border-orange-500/25',  ring: '#f97316', icon: TrendingDown },
  unsuitable:{ label: 'UNSUITABLE', color: 'text-red-300',     bg: 'bg-red-500/[0.08]',     border: 'border-red-500/30',     ring: '#ef4444', icon: ShieldOff },
};

export default function InvestmentScore({ score, rating, dataCompleteness }: Props) {
  const meta = RATING_META[rating];
  const Icon = meta.icon;
  const RADIUS = 38;
  const CIRC = 2 * Math.PI * RADIUS;
  const offset = CIRC - (score / 100) * CIRC;
  const completePct = Math.round(dataCompleteness * 100);

  // Animated counter — smoothly counts up/down to the target score
  const [displayed, setDisplayed] = useState(score);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = displayed;
    const delta = score - start;
    if (delta === 0) return;
    const duration = 600; // ms
    const t0 = performance.now();
    const step = (now: number) => {
      const elapsed = now - t0;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(start + delta * eased));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  return (
    <div className={`rounded-xl p-4 border ${meta.bg} ${meta.border} animate-fade-in`}>
      <div className="flex items-center gap-4">
        <div className="relative w-[96px] h-[96px] shrink-0" role="img" aria-label={`Investment score ${score} out of 100`}>
          <svg viewBox="0 0 96 96" className="-rotate-90 w-full h-full">
            <circle cx="48" cy="48" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <circle
              cx="48" cy="48" r={RADIUS}
              fill="none"
              stroke={meta.ring}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold font-mono ${meta.color}`}>{displayed}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
            Investment Score
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${meta.bg} ${meta.border} border ${meta.color} text-xs font-bold`}>
            <Icon className="w-3 h-3" aria-hidden="true" />
            {meta.label}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
            <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-accent/60 transition-all duration-500"
                style={{ width: `${completePct}%` }}
              />
            </div>
            <span className="font-mono">{completePct}%</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
            {completePct < 60 && <AlertCircle className="w-2.5 h-2.5 text-yellow-500" />}
            data completeness
          </div>
        </div>
      </div>
    </div>
  );
}
