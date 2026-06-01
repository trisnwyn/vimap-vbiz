'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Brain,
  Search,
  FileText,
  GitCompareArrows,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { AgentEvent, AgentPhase } from '@/types/intel';

interface AgentActivityStreamProps {
  events: AgentEvent[];
  phase: AgentPhase | null;
  /** True while the stream is actively running (drives the pulsing indicator). */
  running: boolean;
  /** Tailwind max-height class for the scrolling feed. Defaults to a compact cap. */
  feedMaxHeight?: string;
}

// Ordered phases shown in the progress rail.
const PHASES: { id: AgentPhase; label: string; icon: LucideIcon }[] = [
  { id: 'planning', label: 'Plan', icon: Brain },
  { id: 'searching', label: 'Search', icon: Search },
  { id: 'reading', label: 'Read', icon: FileText },
  { id: 'analyzing', label: 'Analyze', icon: GitCompareArrows },
  { id: 'synthesizing', label: 'Synthesize', icon: Sparkles },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
];

// Map a live phase onto the rail index (cross-referencing folds into analyze).
const PHASE_INDEX: Record<AgentPhase, number> = {
  planning: 0,
  searching: 1,
  reading: 2,
  analyzing: 3,
  'cross-referencing': 3,
  synthesizing: 4,
  done: 5,
  error: 5,
};

const TYPE_ICON: Record<string, LucideIcon> = {
  status: Loader2,
  thought: Lightbulb,
  query: Search,
  source: FileText,
  finding: GitCompareArrows,
  briefing: CheckCircle2,
  error: AlertTriangle,
};

const TYPE_ACCENT: Record<string, string> = {
  status: 'text-accent',
  thought: 'text-amber-500',
  query: 'text-blue-500',
  source: 'text-[#6b7280]',
  finding: 'text-accent',
  briefing: 'text-accent',
  error: 'text-red-500',
};

export default function AgentActivityStream({ events, phase, running, feedMaxHeight = 'max-h-[220px]' }: AgentActivityStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIndex = phase ? PHASE_INDEX[phase] : 0;
  const isDone = phase === 'done' || phase === 'error';

  // Expanded while running; auto-collapse 700ms after completion.
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!running && isDone) {
      const t = setTimeout(() => setOpen(false), 700);
      return () => clearTimeout(t);
    }
    if (running) setOpen(true);
  }, [running, isDone]);

  // Auto-scroll to the newest event.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [events.length]);

  const stepCount = events.filter((e) => e.type !== 'status').length;

  return (
    <div className="rounded-xl border border-[#35b779]/[0.18] bg-[#faf8f3]/70 overflow-hidden">
      {/* Collapsed summary bar — always visible, acts as toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#35b779]/[0.04] transition-colors text-left"
        aria-expanded={open}
      >
        {running ? (
          <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0" />
        ) : phase === 'error' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
        )}
        <span className="text-[11px] text-[#374151] font-medium flex-1 truncate">
          {running
            ? `Thinking… ${stepCount > 0 ? `· ${stepCount} steps` : ''}`
            : phase === 'error'
            ? 'Research failed'
            : `Research complete · ${stepCount} steps`}
        </span>
        <span className="text-[10px] text-[#9ca3af] shrink-0 flex items-center gap-0.5">
          {open ? 'Hide' : 'Show'} thinking
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
      </button>

      {/* Expandable content */}
      {open && (
        <>
          {/* Phase rail */}
          <div className="flex items-center gap-1 px-3 py-2 border-t border-b border-[#35b779]/[0.10] bg-[#35b779]/[0.03]">
            {PHASES.map((p, i) => {
              const Icon = p.icon;
              const isActive = i === activeIndex && !isDone;
              const isPhaseDone = i < activeIndex || phase === 'done';
              const isError = phase === 'error' && i === activeIndex;
              return (
                <div key={p.id} className="flex items-center gap-1 flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-0.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isError ? 'bg-red-500/15 text-red-500'
                        : isPhaseDone ? 'bg-accent/20 text-accent'
                        : isActive ? 'bg-accent/15 text-accent ring-2 ring-accent/30'
                        : 'bg-[#35b779]/[0.06] text-[#9ca3af]'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${isActive ? 'animate-pulse' : ''}`} />
                    </div>
                    <span className={`text-[8px] font-medium truncate max-w-[40px] ${isActive || isPhaseDone ? 'text-[#374151]' : 'text-[#9ca3af]'}`}>
                      {p.label}
                    </span>
                  </div>
                  {i < PHASES.length - 1 && (
                    <div className={`h-0.5 flex-1 rounded-full transition-all duration-500 ${i < activeIndex || phase === 'done' ? 'bg-accent/40' : 'bg-[#35b779]/[0.10]'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Event feed */}
          <div ref={scrollRef} className={`${feedMaxHeight} overflow-y-auto px-3 py-2 space-y-1.5`}>
            {events.length === 0 && running && (
              <div className="flex items-center gap-2 py-2 text-xs text-[#6b7280]">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                Starting the intelligence run…
              </div>
            )}
            {events.map((e) => {
              const Icon = TYPE_ICON[e.type] ?? Lightbulb;
              const accent = TYPE_ACCENT[e.type] ?? 'text-[#6b7280]';
              const spin = e.type === 'status' && running;

              if (e.type === 'source' && e.source) {
                return (
                  <a
                    key={e.id}
                    href={e.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-white/60 border border-[#35b779]/[0.10] hover:border-accent/30 hover:bg-white transition-colors animate-fade-in group"
                  >
                    <span className="mt-0.5 shrink-0 text-[10px] font-mono font-bold text-accent bg-accent/10 rounded px-1 py-0.5">
                      {e.source.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[#1f2937] leading-snug line-clamp-2 group-hover:text-[#111827]">
                        {e.source.title}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[#9ca3af] mt-0.5">
                        {e.source.source}
                        {e.source.publishedAt && <span>· {e.source.publishedAt.slice(0, 10)}</span>}
                        <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </span>
                  </a>
                );
              }

              return (
                <div key={e.id} className="flex items-start gap-2 px-1 py-0.5 animate-fade-in">
                  <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${accent} ${spin ? 'animate-spin' : ''}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] leading-snug ${e.type === 'thought' ? 'italic text-[#4b5563]' : 'text-[#1f2937]'}`}>
                      {e.message}
                    </p>
                    {e.detail && e.type !== 'query' && (
                      <p className="text-[10px] text-[#9ca3af] leading-snug mt-0.5 truncate">{e.detail}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
