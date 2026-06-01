'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Play, RotateCcw, Square, AlertTriangle, Globe2, Settings2 } from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useIntelStream } from '@/hooks/useIntelStream';
import { useLastBriefing } from '@/hooks/useLastBriefing';
import { profileSummary } from '@/lib/intel/prompts';
import AgentActivityStream from '../AgentActivityStream';
import BriefingView from '../BriefingView';
import ForecastSection from './ForecastSection';
import MidoriAvatar from '../../midori/MidoriAvatar';

interface TrendsTabProps {
  year: number;
  selectedProvince: string | null;
  /** Bumped by the dashboard after onboarding / profile save to trigger an auto-run. */
  autoRunToken: number;
  onEditProfile: () => void;
}

export default function TrendsTab({ year, selectedProvince, autoRunToken, onEditProfile }: TrendsTabProps) {
  const { profile } = useBusinessProfile();
  const { status, events, phase, briefing, streamedSummary, error, run, abort, reset } = useIntelStream();
  const { save: saveLastBriefing } = useLastBriefing();

  const running = status === 'running';

  // Persist completed briefing for the RAG context.
  useEffect(() => {
    if (status === 'done' && briefing) saveLastBriefing(briefing);
  }, [status, briefing, saveLastBriefing]);

  const handleRun = useCallback(() => {
    if (profile) run(profile, year);
  }, [profile, run, year]);

  // Auto-run when the dashboard signals a fresh onboarding / profile change.
  const lastToken = useRef(0);
  useEffect(() => {
    if (autoRunToken > 0 && autoRunToken !== lastToken.current && profile) {
      lastToken.current = autoRunToken;
      reset();
      run(profile, year);
    }
  }, [autoRunToken, profile, run, reset, year]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[920px] mx-auto p-3 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <MidoriAvatar size="sm" />
              <h2 className="text-sm font-bold text-[#111827]">Current Trends</h2>
            </div>
            <p className="text-[11px] text-[#6b7280] leading-snug">{profile && profileSummary(profile)}</p>
          </div>
          <button
            onClick={onEditProfile}
            className="flex items-center gap-1 px-2.5 min-h-[32px] rounded-lg text-[11px] font-medium text-[#374151] hover:text-[#111827] glass-btn transition-all shrink-0"
          >
            <Settings2 className="w-3 h-3" />
            Profile
          </button>
        </div>

        {/* Run controls */}
        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <button
              onClick={handleRun}
              className="flex items-center justify-center gap-2 px-4 min-h-[40px] rounded-lg text-xs font-bold text-white transition-all flex-1"
              style={{
                background: 'linear-gradient(135deg, rgba(53,183,121,0.95) 0%, rgba(34,85,63,0.97) 100%)',
                boxShadow: '0 2px 12px rgba(53,183,121,0.30)',
              }}
            >
              <Play className="w-3.5 h-3.5" />
              Run intelligence briefing
            </button>
          )}
          {running && (
            <button
              onClick={abort}
              className="flex items-center justify-center gap-2 px-4 min-h-[40px] rounded-lg text-xs font-semibold text-[#374151] glass-btn transition-all flex-1"
            >
              <Square className="w-3.5 h-3.5" />
              Stop
            </button>
          )}
          {(status === 'done' || status === 'error') && (
            <button
              onClick={handleRun}
              className="flex items-center justify-center gap-2 px-4 min-h-[40px] rounded-lg text-xs font-bold text-accent glass-btn !bg-accent/10 !border-accent/25 hover:!bg-accent/20 transition-all flex-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-run briefing
            </button>
          )}
        </div>

        {/* Idle hint */}
        {status === 'idle' && (
          <div className="rounded-xl border border-[#35b779]/[0.15] bg-[#35b779]/[0.04] p-5 text-center">
            <Globe2 className="w-7 h-7 text-accent/60 mx-auto mb-2" />
            <p className="text-xs text-[#374151] leading-relaxed max-w-md mx-auto">
              The agent will scan live news, cross-reference VinMap forest, fire &amp; World Bank data, and
              synthesize a personalized, cited briefing for your business. Watch it think in real time.
            </p>
          </div>
        )}

        {/* Live agent stream — shown while running and kept visible after. */}
        {(running || events.length > 0) && (
          <AgentActivityStream events={events} phase={phase} running={running} feedMaxHeight="max-h-[440px]" />
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/[0.07] border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-600">Intelligence run failed</p>
              <p className="text-[11px] text-[#6b7280] leading-snug mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Briefing */}
        {briefing && (
          <BriefingView
            briefing={briefing}
            streamedSummary={streamedSummary}
            streaming={running && !!streamedSummary}
          />
        )}

        {/* Statistical forecast — always available, complements the live briefing. */}
        <div className="pt-2 border-t border-[#35b779]/[0.12]">
          <ForecastSection year={year} selectedProvince={selectedProvince} />
        </div>
      </div>
    </div>
  );
}
