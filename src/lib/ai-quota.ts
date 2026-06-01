// ─────────────────────────────────────────────────────────────────────────
// AI quota helpers — per-user monthly limit check + increment.
//
// Used by /api/intel/stream and /api/intel/chat before consuming Groq tokens.
// Gracefully degrades when Clerk or Supabase are not configured:
//   - Clerk unavailable / unauthenticated → allow (IP rate-limit is the guard)
//   - Supabase unavailable                → allow (fail-open for availability)
// ─────────────────────────────────────────────────────────────────────────

import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from './supabase';
import { LIMITS } from './subscription';
import type { Tier } from '@/types/subscription';

export interface QuotaCheck {
  allowed: boolean;
  userId: string | null;
  tier: Tier;
  /** Human-readable reason when allowed = false. */
  reason?: string;
}

/**
 * Check whether the authenticated user has quota remaining for an AI analysis.
 * Anonymous calls are allowed — the existing IP rate-limit is their guard.
 */
export async function checkAiQuota(): Promise<QuotaCheck> {
  // ── Auth ──────────────────────────────────────────────────────────────
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId ?? null;
  } catch {
    // Clerk not configured or token invalid → anonymous path.
  }

  if (!userId) {
    // Anonymous: IP rate-limit applies; no per-user quota needed.
    return { allowed: true, userId: null, tier: 'free' };
  }

  // ── Subscription lookup ───────────────────────────────────────────────
  let tier: Tier = 'free';
  let used = 0;

  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('tier, ai_analyses_used, ai_analyses_reset_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // No subscription row → free tier, allow (no quota to enforce yet).
      return { allowed: true, userId, tier: 'free' };
    }

    tier = (data.tier as Tier) ?? 'free';

    // Auto-reset monthly counter when past the reset date.
    const resetAt = new Date(data.ai_analyses_reset_at as string);
    if (new Date() > resetAt) {
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1, 1);
      nextReset.setHours(0, 0, 0, 0);
      await supabaseAdmin
        .from('subscriptions')
        .update({ ai_analyses_used: 0, ai_analyses_reset_at: nextReset.toISOString() })
        .eq('user_id', userId);
      used = 0;
    } else {
      used = (data.ai_analyses_used as number) ?? 0;
    }
  } catch {
    // Supabase unavailable → fail open (availability > strict enforcement).
    return { allowed: true, userId, tier };
  }

  // ── Quota decision ────────────────────────────────────────────────────
  const limit = LIMITS[tier].aiAnalysis;

  if (limit === 0) {
    return {
      allowed: false,
      userId,
      tier,
      reason: 'AI analysis is not included in your current plan. Upgrade to Analyst or higher.',
    };
  }

  if (limit !== Infinity && used >= limit) {
    return {
      allowed: false,
      userId,
      tier,
      reason: `Monthly AI analysis limit (${limit}) reached. Resets on the 1st of next month.`,
    };
  }

  return { allowed: true, userId, tier };
}

/**
 * Increment ai_analyses_used for a user. Fire-and-forget — a failure here
 * must never block or fail the caller's response.
 */
export async function incrementAiUsage(userId: string): Promise<void> {
  if (!userId) return;
  try {
    // Read-then-write is acceptable for monthly usage counters where
    // occasional double-counts under race conditions are negligible.
    const { data } = await supabaseAdmin
      .from('subscriptions')
      .select('ai_analyses_used')
      .eq('user_id', userId)
      .single();

    if (data) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ ai_analyses_used: ((data.ai_analyses_used as number) ?? 0) + 1 })
        .eq('user_id', userId);
    }
  } catch {
    // Best-effort — silently ignore.
  }
}
