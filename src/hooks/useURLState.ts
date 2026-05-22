'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

type Tab = 'stats' | 'news' | 'assess' | 'ai';
export type ViewMode = 'map' | 'intel';

const VALID_TABS: Tab[] = ['stats', 'news', 'assess', 'ai'];
const VALID_VIEWS: ViewMode[] = ['map', 'intel'];

// Backwards-compat: old `?tab=eudr` URLs land on the new Assess tab.
export function parseTab(val: string | null): Tab {
  if (val === 'eudr') return 'assess';
  if (val && VALID_TABS.includes(val as Tab)) return val as Tab;
  return 'stats';
}

export function parseYear(val: string | null): number {
  if (!val) return 2024;
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 2001 || n > 2024) return 2024;
  return n;
}

export function parseView(val: string | null): ViewMode {
  if (val && VALID_VIEWS.includes(val as ViewMode)) return val as ViewMode;
  return 'map';
}

/**
 * One-way sync: state → URL.
 * The component reads initial values via useInitialURLState() at mount,
 * and this hook just keeps the URL in sync as state changes.
 */
export function useURLState(
  state: { year: number; tab: Tab; province: string | null; view: ViewMode },
) {
  const router = useRouter();
  const pathname = usePathname();
  const lastSynced = useRef('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      try {
        const params = new URLSearchParams();
        if (state.year !== 2024) params.set('year', String(state.year));
        if (state.tab !== 'stats') params.set('tab', state.tab);
        if (state.province) params.set('province', state.province);
        if (state.view !== 'map') params.set('view', state.view);

        const qs = params.toString();
        const url = qs ? `${pathname}?${qs}` : pathname;

        if (url === lastSynced.current) return;
        lastSynced.current = url;

        router.replace(url, { scroll: false });
      } catch {
        // URL sync is non-critical
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [state.year, state.tab, state.province, state.view, pathname, router]);
}

/**
 * Read URL search params once to derive initial state values.
 * Must be called inside a component wrapped in <Suspense>.
 */
export function useInitialURLState() {
  const searchParams = useSearchParams();

  // useSearchParams returns a stable object on mount — safe to read synchronously.
  // We memoize the initial values via a ref so they stay constant across re-renders.
  const initial = useRef<{
    year: number;
    tab: Tab;
    province: string | null;
    view: ViewMode;
  } | null>(null);

  if (!initial.current) {
    initial.current = {
      year: parseYear(searchParams.get('year')),
      tab: parseTab(searchParams.get('tab')),
      province: searchParams.get('province') || null,
      view: parseView(searchParams.get('view')),
    };
  }

  return initial.current;
}
