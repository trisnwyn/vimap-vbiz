import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ tier: 'free', aiAnalysesUsed: 0 });

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('tier, status, current_period_end, ai_analyses_used, ai_analyses_reset_at')
    .eq('user_id', userId)
    .single();

  if (!data || data.status === 'canceled') {
    return NextResponse.json({ tier: 'free', aiAnalysesUsed: 0 });
  }

  // Reset monthly AI counter if past reset date
  const resetAt = new Date(data.ai_analyses_reset_at as string);
  const now = new Date();
  if (now > resetAt) {
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    await supabaseAdmin
      .from('subscriptions')
      .update({ ai_analyses_used: 0, ai_analyses_reset_at: nextReset.toISOString() })
      .eq('user_id', userId);
    data.ai_analyses_used = 0;
  }

  return NextResponse.json({
    tier: data.tier,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    aiAnalysesUsed: data.ai_analyses_used,
  });
}
