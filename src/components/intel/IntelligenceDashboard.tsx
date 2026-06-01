'use client';

import { useState, useCallback } from 'react';
import { TrendingUp, Telescope, Building2 } from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import type { BusinessProfile } from '@/types/intel';
import BusinessProfileForm from './BusinessProfileForm';
import TrendsTab from './dashboard/TrendsTab';
import ChatTab from './dashboard/ChatTab';
import ProfileTab from './dashboard/ProfileTab';
import MidoriAvatar from '../midori/MidoriAvatar';
import MidoriSplash from '../midori/MidoriSplash';

type SubTab = 'trends' | 'research' | 'profile';

interface IntelligenceDashboardProps {
  year: number;
  selectedProvince: string | null;
}

const NAV: { id: SubTab; label: string; hint: string; icon: typeof TrendingUp }[] = [
  { id: 'trends', label: 'Current Trends', hint: 'Live briefing + forecast', icon: TrendingUp },
  { id: 'research', label: 'Midori', hint: 'Your dedicated research analyst', icon: Telescope },
  { id: 'profile', label: 'Company Profile', hint: 'Personalize the agent', icon: Building2 },
];

export default function IntelligenceDashboard({ year, selectedProvince }: IntelligenceDashboardProps) {
  const { profile, hydrated, hasProfile, saveProfile } = useBusinessProfile();
  const [subTab, setSubTab] = useState<SubTab>('trends');
  // After onboarding we want the briefing to auto-run on the Trends tab.
  const [autoRunToken, setAutoRunToken] = useState(0);

  const handleOnboard = useCallback(
    (next: BusinessProfile) => {
      saveProfile(next);
      setSubTab('trends');
      setAutoRunToken((t) => t + 1);
    },
    [saveProfile],
  );

  // ── Pre-hydration ──
  if (!hydrated) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-2 animate-spin" />
          <p className="text-xs text-[#6b7280]">Loading intelligence…</p>
        </div>
      </div>
    );
  }

  // ── Profile gate (onboarding) — ignores sub-tab until a profile exists ──
  if (!hasProfile) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          <div className="text-center mb-5">
            <h1 className="text-lg font-bold text-[#111827]">Meet Midori</h1>
            <p className="text-xs text-[#6b7280] mt-1 max-w-md mx-auto leading-relaxed">
              Tell Midori about your business once. She personalises every briefing, forecast, and
              answer to your commodities, sourcing regions, and concerns.
            </p>
          </div>
          <BusinessProfileForm initial={profile} mode="onboard" onSave={handleOnboard} />
        </div>
      </div>
    );
  }

  return (
    <>
    <MidoriSplash />
    <div className="h-full flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Mobile: horizontal scroll tab bar */}
      <nav className="md:hidden flex items-center gap-1 p-2 border-b border-[#35b779]/[0.15] overflow-x-auto shrink-0 bg-[#faf8f3]/95 backdrop-blur-sm">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            aria-pressed={subTab === id}
            className={`flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              subTab === id
                ? 'bg-accent/15 text-accent'
                : 'text-[#374151] hover:text-[#111827] hover:bg-[#35b779]/8'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Desktop: vertical left rail */}
      <aside className="hidden md:flex w-[220px] lg:w-[240px] shrink-0 flex-col gap-1 p-3 border-r border-[#35b779]/[0.15] bg-[#f5f0e8]">
        <div className="px-2 pb-2 mb-1 border-b border-[#35b779]/[0.12]">
          <div className="flex items-center gap-2">
            <MidoriAvatar size="xs" />
            <div>
              <h2 className="text-[13px] font-bold text-[#111827]">Midori</h2>
              <p className="text-[10px] text-[#6b7280]">VinMap Intelligence</p>
            </div>
          </div>
        </div>
        {NAV.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            aria-pressed={subTab === id}
            className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
              subTab === id
                ? 'bg-accent/15 text-accent'
                : 'text-[#374151] hover:text-[#111827] hover:bg-[#35b779]/8'
            }`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{label}</span>
              <span className={`block text-[10px] leading-snug mt-0.5 ${subTab === id ? 'text-accent/80' : 'text-[#9ca3af]'}`}>
                {hint}
              </span>
            </span>
          </button>
        ))}
      </aside>

      {/* Content */}
      <section className="flex-1 min-w-0 overflow-hidden">
        {subTab === 'trends' && (
          <TrendsTab
            year={year}
            selectedProvince={selectedProvince}
            autoRunToken={autoRunToken}
            onEditProfile={() => setSubTab('profile')}
          />
        )}
        {subTab === 'research' && (
          <ChatTab mode="agentic" year={year} />
        )}
        {subTab === 'profile' && (
          <ProfileTab onSaveAndRun={handleOnboard} />
        )}
      </section>
    </div>
    </>
  );
}

