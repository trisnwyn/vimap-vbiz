'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import type { BusinessProfile } from '@/types/intel';

const STORAGE_KEY = 'vinmap.businessProfile';

/**
 * Sensible default profile — pre-tuned to the app's headline use case
 * (a Central Highlands coffee exporter shipping to the EU under EUDR).
 * Used as the starting point for the onboarding form, never auto-saved.
 */
export const DEFAULT_PROFILE: BusinessProfile = {
  companyName: '',
  role: 'exporter',
  commodities: ['coffee'],
  sourcingProvinces: ['dak_lak', 'gia_lai'],
  markets: ['eu'],
  concerns: ['eudr', 'supply'],
  language: 'en',
  updatedAt: 0,
};

function readProfile(): BusinessProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BusinessProfile>;
    // Minimal shape guard — tolerate older/partial blobs.
    if (!parsed || typeof parsed !== 'object' || !parsed.role) return null;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      commodities: parsed.commodities ?? [],
      sourcingProvinces: parsed.sourcingProvinces ?? [],
      markets: parsed.markets ?? [],
      concerns: parsed.concerns ?? [],
    } as BusinessProfile;
  } catch {
    return null;
  }
}

/**
 * Gate-free business profile, persisted to localStorage.
 *
 * SSR-safe: starts `null` on the server and during the first client render,
 * then hydrates from storage in an effect to avoid hydration mismatches.
 * `hydrated` lets callers distinguish "loading" from "no profile yet".
 */
export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on mount.
  useEffect(() => {
    startTransition(() => {
      setProfile(readProfile());
      setHydrated(true);
    });
  }, []);

  // Keep multiple tabs / components in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setProfile(readProfile());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const saveProfile = useCallback((next: BusinessProfile) => {
    const stamped: BusinessProfile = { ...next, updatedAt: Date.now() };
    setProfile(stamped);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    } catch {
      // Storage unavailable (private mode, quota) — keep in-memory copy.
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    /** The saved profile, or null if none / not yet hydrated. */
    profile,
    /** True once we've read localStorage at least once on the client. */
    hydrated,
    /** True when the user has completed onboarding. */
    hasProfile: hydrated && profile !== null,
    saveProfile,
    clearProfile,
  };
}
