'use client';

import { useCallback, useEffect, useState, startTransition } from 'react';
import type { Briefing } from '@/types/intel';

const STORAGE_KEY = 'vinmap.lastBriefing';

/** Compact record stored in localStorage — avoids persisting citation blobs. */
export interface LastBriefingRecord {
  id: string;
  headline: string;
  executiveSummary: string;
  generatedAt: number;
}

function toRecord(b: Briefing): LastBriefingRecord {
  return { id: b.id, headline: b.headline, executiveSummary: b.executiveSummary, generatedAt: b.generatedAt };
}

function readStorage(): LastBriefingRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastBriefingRecord;
    if (typeof parsed.id !== 'string' || typeof parsed.executiveSummary !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function useLastBriefing() {
  const [lastBriefing, setLastBriefing] = useState<LastBriefingRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setLastBriefing(readStorage());
      setHydrated(true);
    });
  }, []);

  const save = useCallback((briefing: Briefing) => {
    const record = toRecord(briefing);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch { /* quota exceeded — ignore */ }
    setLastBriefing(record);
  }, []);

  const clear = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setLastBriefing(null);
  }, []);

  return { lastBriefing, hydrated, save, clear };
}
