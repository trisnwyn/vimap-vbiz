'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { canAccess, LIMITS } from '@/lib/subscription';
import type { Tier } from '@/types/subscription';
import type { Feature } from '@/lib/subscription';

interface SubscriptionState {
  tier: Tier;
  loading: boolean;
  aiAnalysesUsed: number;
  aiAnalysesLimit: number;
  can: (feature: Feature) => boolean;
  hasAiQuota: boolean;
}

export function useSubscription(): SubscriptionState {
  const { user, isLoaded } = useUser();
  const [tier, setTier] = useState<Tier>('free');
  const [aiAnalysesUsed, setAiAnalysesUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }
    fetch('/api/user/subscription')
      .then((r) => r.json())
      .then((data) => {
        setTier(data.tier ?? 'free');
        setAiAnalysesUsed(data.aiAnalysesUsed ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, isLoaded]);

  const aiLimit = LIMITS[tier].aiAnalysis;

  return {
    tier,
    loading,
    aiAnalysesUsed,
    aiAnalysesLimit: aiLimit,
    can: (feature: Feature) => canAccess(tier, feature),
    hasAiQuota: aiLimit === Infinity || aiAnalysesUsed < aiLimit,
  };
}
