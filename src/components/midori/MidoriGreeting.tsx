'use client';

import type { BusinessProfile } from '@/types/intel';
import MidoriAvatar from './MidoriAvatar';

/** Minimal shape the greeting needs — satisfied by both Briefing and LastBriefingRecord. */
interface BriefingLike {
  generatedAt: number;
}

interface Props {
  profile: BusinessProfile | null;
  lastBriefing: BriefingLike | null;
}

const HOUR = 60 * 60 * 1000;

function greetingFor(lastBriefing: BriefingLike | null): string {
  if (!lastBriefing) return 'Ready to start. What would you like to research first?';
  const age = Date.now() - lastBriefing.generatedAt;
  if (age < 2 * HOUR) return 'Welcome back. Anything new to dig into since the last briefing?';
  if (age < 24 * HOUR)
    return "I've been watching your markets. Want a fresh briefing, or do you have a specific question?";
  return "It's been a while — markets may have shifted. Ready when you are.";
}

export default function MidoriGreeting({ profile, lastBriefing }: Props) {
  const message = greetingFor(lastBriefing);
  const commodities = profile?.commodities ?? [];

  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center text-center">
        <MidoriAvatar size="xl" gem />
        <p className="mt-3 text-base font-bold text-[#111827]">Midori</p>
        <p className="text-[11px] text-[#6b7280] mt-0.5">Your dedicated research analyst</p>
        <p className="mt-3 text-[13px] text-[#374151] leading-relaxed max-w-[280px] text-center">
          {message}
        </p>
        {commodities.length > 0 && (
          <p className="mt-3 text-[11px] text-[#9ca3af]">
            Watching: <span className="text-[#374151]">{commodities.join(' · ')}</span>
          </p>
        )}
      </div>
    </div>
  );
}
