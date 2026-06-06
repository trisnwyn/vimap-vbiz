'use client';

import { useEffect, useRef, useState } from 'react';
import type { BusinessProfile } from '@/types/intel';
import type { ForecastPulse } from '@/app/api/forecast/pulse/route';

interface PulseState {
  pulse: ForecastPulse | null;
  /** The previous successful pulse — lets the UI render ▲/▼ deltas. */
  prev: ForecastPulse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Module-level cache (survives re-renders / tab switches, reset on reload).
let _cache: { key: string; data: ForecastPulse; ts: number } | null = null;
const POLL_MS = 3 * 60 * 1000; // 3 min — matches the server cache TTL

function scopeKey(profile: BusinessProfile | null, year: number): string {
  const ids = profile?.sourcingProvinces?.length ? [...profile.sourcingProvinces].sort() : ['*'];
  return `${ids.join(',')}|${year}`;
}

/**
 * Continuously-polling forecast pulse. Mirrors the useNews cache pattern but
 * adds an interval + visibility handling: polling pauses while the tab is
 * hidden and refetches immediately on refocus, so we never hammer the API in
 * a background tab. Returns the current pulse plus the previous one for deltas.
 */
export function useForecastPulse(profile: BusinessProfile | null, year: number): PulseState {
  const key = scopeKey(profile, year);
  const cacheValid = _cache && _cache.key === key && Date.now() - _cache.ts < POLL_MS;

  const [state, setState] = useState<PulseState>({
    pulse: cacheValid ? _cache!.data : null,
    prev: null,
    loading: !cacheValid,
    error: null,
    lastUpdated: cacheValid ? _cache!.ts : null,
  });

  // Keep the latest pulse in a ref so a refetch can move it into `prev`.
  const latestRef = useRef<ForecastPulse | null>(cacheValid ? _cache!.data : null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchPulse = async () => {
      if (typeof document !== 'undefined' && document.hidden) return; // skip while hidden
      try {
        const res = await fetch('/api/forecast/pulse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile, year }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as ForecastPulse;
        if (cancelled) return;
        const prev = latestRef.current;
        latestRef.current = data;
        _cache = { key, data, ts: Date.now() };
        setState({ pulse: data, prev, loading: false, error: null, lastUpdated: Date.now() });
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      }
    };

    // Initial fetch only if the module cache is stale for this scope/year.
    if (!_cache || _cache.key !== key || Date.now() - _cache.ts >= POLL_MS) {
      void fetchPulse();
    } else {
      latestRef.current = _cache.data;
      setState({ pulse: _cache.data, prev: null, loading: false, error: null, lastUpdated: _cache.ts });
    }

    intervalId = setInterval(fetchPulse, POLL_MS);

    // Refetch immediately when the tab becomes visible again (if stale).
    const onVisible = () => {
      if (!document.hidden && (!_cache || Date.now() - _cache.ts >= POLL_MS)) void fetchPulse();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, profile, year]);

  return state;
}
