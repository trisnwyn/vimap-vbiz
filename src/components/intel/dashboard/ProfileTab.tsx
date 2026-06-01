'use client';

import { useState } from 'react';
import { Building2, Clock, RotateCcw, Pencil, CheckCircle2, Sparkles } from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useLastBriefing } from '@/hooks/useLastBriefing';
import { profileSummary } from '@/lib/intel/prompts';
import BusinessProfileForm from '../BusinessProfileForm';
import type { BusinessProfile } from '@/types/intel';

interface ProfileTabProps {
  /** Callback so the dashboard can auto-navigate to Trends after a profile save. */
  onSaveAndRun: (profile: BusinessProfile) => void;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-[#35b779]/[0.08] last:border-0">
      <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider min-w-[90px] mt-0.5">
        {label}
      </span>
      <span className="text-[12px] text-[#374151] leading-snug">{value || '—'}</span>
    </div>
  );
}

export default function ProfileTab({ onSaveAndRun }: ProfileTabProps) {
  const { profile, saveProfile, clearProfile } = useBusinessProfile();
  const { lastBriefing, clear: clearBriefing } = useLastBriefing();
  const [editing, setEditing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSave = (next: BusinessProfile) => {
    saveProfile(next);
    setEditing(false);
    onSaveAndRun(next);
  };

  const handleClearProfile = () => {
    clearProfile();
    clearBriefing();
    setShowClearConfirm(false);
  };

  if (editing && profile) {
    return (
      <div className="h-full overflow-hidden flex flex-col">
        <BusinessProfileForm
          initial={profile}
          mode="edit"
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  if (!profile) return null;

  const updatedDate = new Date(profile.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[720px] mx-auto p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#111827]">
                {profile.companyName || 'Your company'}
              </h2>
              <p className="text-[11px] text-[#6b7280]">{profileSummary(profile)}</p>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 min-h-[34px] rounded-lg text-[11px] font-medium text-[#374151] hover:text-[#111827] glass-btn transition-all shrink-0"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>

        {/* Profile details card */}
        <div className="rounded-xl border border-[#35b779]/[0.15] bg-white/55 p-4 space-y-0.5">
          <InfoRow label="Role" value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} />
          <InfoRow label="Commodities" value={profile.commodities.join(', ')} />
          <InfoRow label="Markets" value={profile.markets.join(', ') || 'Not specified'} />
          <InfoRow label="Concerns" value={profile.concerns.join(', ') || 'Not specified'} />
          <InfoRow
            label="Sourcing"
            value={
              profile.sourcingProvinces.length
                ? `${profile.sourcingProvinces.length} province(s) selected`
                : 'All provinces (national)'
            }
          />
          <InfoRow label="Language" value={profile.language === 'vi' ? 'Tiếng Việt' : 'English'} />
          <InfoRow label="Updated" value={updatedDate} />
        </div>

        {/* Last briefing card */}
        {lastBriefing ? (
          <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-4 space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">Last briefing</span>
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#9ca3af]">
                <Clock className="w-3 h-3" />
                {new Date(lastBriefing.generatedAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="text-[12px] font-semibold text-[#111827] leading-snug">{lastBriefing.headline}</p>
            <p className="text-[11px] text-[#4b5563] leading-relaxed line-clamp-4">
              {lastBriefing.executiveSummary}
            </p>
            <p className="text-[10px] text-[#9ca3af]">
              This summary is automatically used to enrich your Ask (RAG) answers.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#35b779]/[0.12] bg-[#35b779]/[0.03] p-4 flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-accent/50 shrink-0" />
            <p className="text-[12px] text-[#6b7280] leading-snug">
              No briefing saved yet. Run an intelligence briefing from the{' '}
              <span className="font-medium text-accent">Current Trends</span> tab to get personalized insights.
            </p>
          </div>
        )}

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
          <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider mb-2">Danger zone</p>
          {!showClearConfirm ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-[#6b7280]">
                Clears your profile and all cached briefings from this browser.
              </p>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 min-h-[32px] rounded-lg text-[11px] font-medium text-red-600 hover:bg-red-100 border border-red-200 transition-colors shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                Reset profile
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-red-600 font-medium flex-1">
                This will clear your profile and briefing history. Continue?
              </p>
              <button
                onClick={handleClearProfile}
                className="px-3 min-h-[30px] rounded-lg text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 min-h-[30px] rounded-lg text-[11px] font-medium text-[#374151] glass-btn transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
