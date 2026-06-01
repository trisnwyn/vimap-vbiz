'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';
import type { BusinessProfile } from '@/types/intel';
import MidoriAvatar from './MidoriAvatar';

interface Props {
  profile: BusinessProfile;
  year: number;
  onResearch?: (query: string) => void;
}

const DISMISS_KEY = 'midori.noticed.dismissed';

export default function MidoriNoticed({ profile, year, onResearch }: Props) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(DISMISS_KEY);
      setDismissed(v === '1');
    } catch { setDismissed(false); }
  }, []);

  if (dismissed || !profile.sourcingProvinces.length) return null;

  // Find sourcing provinces with elevated loss rates
  const alerts = profile.sourcingProvinces
    .map(id => provinces.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({
      name: p!.name,
      rate: interpolateYear(p!.lossRate, year),
      id: p!.id,
    }))
    .filter(p => p.rate >= 0.010) // 1.0%+ is notable
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  if (!alerts.length) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  const query = `Analyse deforestation risk and EUDR compliance for my sourcing provinces: ${
    alerts.map(a => `${a.name} (${(a.rate * 100).toFixed(1)}%/yr loss)`).join(', ')
  }. What should I watch out for?`;

  return (
    <div className="mx-3 mt-3 flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] animate-fade-in">
      <MidoriAvatar size="xs" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-[#111827]">Midori noticed</p>
        <p className="text-[11px] text-[#374151] leading-snug mt-0.5">
          {alerts.map(a => `${a.name} (${(a.rate * 100).toFixed(1)}%/yr)`).join(' · ')}
          {' '}— {alerts.length === 1 ? 'one of your' : `${alerts.length} of your`} sourcing {alerts.length === 1 ? 'province is' : 'provinces are'} showing elevated forest loss.
        </p>
        {onResearch && (
          <button
            onClick={() => onResearch(query)}
            className="mt-1.5 text-[11px] font-semibold text-amber-600 hover:text-amber-700 underline decoration-dotted transition-colors"
          >
            Research now →
          </button>
        )}
      </div>
      <button onClick={dismiss} className="shrink-0 p-0.5 rounded text-[#9ca3af] hover:text-[#374151] transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
