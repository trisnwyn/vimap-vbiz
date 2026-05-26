'use client';

import { Lock, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Tier } from '@/types/subscription';

interface Props {
  feature: string;
  requiredTier?: Exclude<Tier, 'free'>;
  description?: string;
  compact?: boolean;
}

export default function UpgradePrompt({
  feature,
  requiredTier = 'analyst',
  description,
  compact = false,
}: Props) {
  const router = useRouter();
  const tierLabel = requiredTier === 'analyst' ? 'Analyst' : 'Professional';
  const price = requiredTier === 'analyst' ? '$39' : '$99';

  if (compact) {
    return (
      <button
        onClick={() => router.push('/pricing')}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
      >
        <Lock className="w-3 h-3" />
        {tierLabel} plan
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-amber-500/[0.08] border border-amber-500/15 flex items-center justify-center mb-3">
        <Lock className="w-5 h-5 text-amber-500" />
      </div>
      <p className="text-xs font-semibold text-[#111827] mb-1">{feature}</p>
      <p className="text-[11px] text-[#6b7280] leading-relaxed mb-3 max-w-[220px]">
        {description ?? `Available on the ${tierLabel} plan and above. Starting at ${price}/month.`}
      </p>
      <button
        onClick={() => router.push('/pricing')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#35b779]/15 text-[#35b779] border border-[#35b779]/25 hover:bg-[#35b779]/25 transition-all"
      >
        <Sparkles className="w-3 h-3" />
        View pricing
      </button>
    </div>
  );
}

export function AiQuotaBanner({ used, limit, onUpgrade }: { used: number; limit: number; onUpgrade?: () => void }) {
  const isNearLimit = used / limit >= 0.8;

  return (
    <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-[11px] ${
      isNearLimit
        ? 'bg-amber-500/[0.06] border-amber-500/20'
        : 'bg-[#35b779]/[0.05] border-[#35b779]/15'
    }`}>
      <div className="flex items-center gap-1.5">
        <Zap className={`w-3 h-3 ${isNearLimit ? 'text-amber-500' : 'text-[#35b779]'}`} />
        <span className="text-[#374151]">
          AI analyses: <span className="font-mono font-bold">{used}/{limit}</span> this month
        </span>
      </div>
      {isNearLimit && (
        <button
          onClick={onUpgrade}
          className="text-[11px] text-[#35b779] font-medium hover:underline"
        >
          Upgrade
        </button>
      )}
    </div>
  );
}
