'use client';

import { useEffect, useState } from 'react';
import type { NewsArticle } from '@/types';

interface NewsState {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
}

// Module-level client-side cache (survives re-renders, reset on page reload)
let _clientCache: { data: NewsArticle[]; ts: number } | null = null;
const CLIENT_CACHE_MS = 5 * 60 * 1000; // 5 min

export function useNews(): NewsState {
  const [state, setState] = useState<NewsState>({
    articles: _clientCache?.data ?? [],
    loading: !_clientCache || Date.now() - _clientCache.ts > CLIENT_CACHE_MS,
    error: null,
  });

  useEffect(() => {
    if (_clientCache && Date.now() - _clientCache.ts < CLIENT_CACHE_MS) {
      setState({ articles: _clientCache.data, loading: false, error: null });
      return;
    }
    let cancelled = false;
    fetch('/api/news')
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(({ articles }: { articles: NewsArticle[] }) => {
        if (cancelled) return;
        _clientCache = { data: articles, ts: Date.now() };
        setState({ articles, loading: false, error: null });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setState(s => ({ ...s, loading: false, error: e.message }));
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}
