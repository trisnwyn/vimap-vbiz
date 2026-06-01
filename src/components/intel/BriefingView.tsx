'use client';

import { useMemo } from 'react';
import { ShieldCheck, ListChecks, ExternalLink, Newspaper } from 'lucide-react';
import type { Briefing, Citation, Severity, TopicCategory } from '@/types/intel';
import RiskRadar from './RiskRadar';
import MidoriAvatar from '../midori/MidoriAvatar';

interface BriefingViewProps {
  briefing: Briefing;
  /** Live-typed summary while synthesizing; falls back to the final summary. */
  streamedSummary?: string;
  /** True while tokens are still streaming in (shows a caret). */
  streaming?: boolean;
}

const SEVERITY_STYLE: Record<Severity, { chip: string; bar: string }> = {
  critical: { chip: 'bg-red-500/12 text-red-600 border-red-500/25', bar: 'bg-red-500' },
  high: { chip: 'bg-orange-500/12 text-orange-600 border-orange-500/25', bar: 'bg-orange-500' },
  medium: { chip: 'bg-amber-500/12 text-amber-600 border-amber-500/25', bar: 'bg-amber-500' },
  low: { chip: 'bg-green-500/12 text-green-700 border-green-500/25', bar: 'bg-green-500' },
};

const CATEGORY_LABEL: Record<TopicCategory, string> = {
  eudr: 'EUDR',
  deforestation: 'Deforestation',
  policy: 'Policy',
  climate: 'Climate',
  agriculture: 'Agriculture',
  price: 'Price',
  supply: 'Supply',
};

function CitationChips({ ids, citations }: { ids: string[]; citations: Citation[] }) {
  if (!ids.length) return null;
  const byId = new Map(citations.map((c) => [c.id, c]));
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {ids.map((id) => {
        const c = byId.get(id);
        if (!c) return null;
        return (
          <a
            key={id}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${c.title} — ${c.source}`}
            className="text-[10px] font-mono font-bold text-accent bg-accent/10 hover:bg-accent/20 rounded px-1 py-0.5 transition-colors"
          >
            {id}
          </a>
        );
      })}
    </span>
  );
}

export default function BriefingView({ briefing, streamedSummary, streaming }: BriefingViewProps) {
  const summary = streaming ? streamedSummary ?? '' : briefing.executiveSummary;
  const generated = useMemo(
    () => new Date(briefing.generatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [briefing.generatedAt],
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Midori attribution */}
      <div className="flex items-center gap-2 mb-1">
        <MidoriAvatar size="xs" />
        <span className="text-[11px] text-[#6b7280]">
          Midori · Intelligence Report · <span className="font-mono">{generated}</span>
        </span>
      </div>

      {/* Headline + exec summary — report cover */}
      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-[#f0faf5] to-white overflow-hidden">
        {/* Cover strip */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#35b779]/[0.12]">
          <MidoriAvatar size="sm" />
          <div>
            <div className="text-[11px] font-bold text-accent uppercase tracking-widest">Midori Intelligence Report</div>
            <div className="text-[10px] text-[#9ca3af]">{generated} · {briefing.citations.length} sources</div>
          </div>
        </div>
        {/* Headline + summary */}
        <div className="p-4">
          <h2 className="text-base font-bold text-[#111827] leading-snug">{briefing.headline}</h2>
          <p className="text-[13px] text-[#1f2937] leading-relaxed mt-2">
            {summary}
            {streaming && <span className="inline-block w-1.5 h-4 align-middle bg-accent/70 ml-0.5 animate-pulse" />}
          </p>
        </div>
      </div>

      {/* Topics */}
      {briefing.topics.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-2">Hot topics</h3>
          <div className="space-y-2">
            {briefing.topics.map((t) => {
              const sev = SEVERITY_STYLE[t.severity] ?? SEVERITY_STYLE.medium;
              return (
                <div key={t.id} className="rounded-lg border border-[#35b779]/[0.15] bg-white/55 overflow-hidden">
                  <div className={`h-0.5 ${sev.bar}`} />
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="text-[13px] font-bold text-[#111827]">{t.title}</h4>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border uppercase tracking-wide font-bold ${sev.chip}`}>
                        {t.severity}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#35b779]/[0.08] text-[#374151] font-medium">
                        {CATEGORY_LABEL[t.category] ?? t.category}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#1f2937] leading-relaxed">
                      {t.summary} <CitationChips ids={t.citationIds} citations={briefing.citations} />
                    </p>
                    {t.relevance && (
                      <p className="text-[11px] text-accent/90 leading-snug mt-1.5 flex items-start gap-1">
                        <span className="font-semibold shrink-0">Why you:</span>
                        <span className="text-[#374151]">{t.relevance}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk radar */}
      {briefing.risks.length > 0 && <RiskRadar risks={briefing.risks} />}

      {/* Sections */}
      {briefing.sections.length > 0 && (
        <div className="space-y-3">
          {briefing.sections.map((s, i) => (
            <div key={i}>
              <h3 className="text-xs font-bold text-[#374151] uppercase tracking-wider mb-1">{s.heading}</h3>
              <p className="text-[12px] text-[#1f2937] leading-relaxed">
                {s.body} <CitationChips ids={s.citationIds} citations={briefing.citations} />
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {briefing.recommendations.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/[0.04] p-3">
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#111827] uppercase tracking-wider mb-2">
            <ListChecks className="w-3.5 h-3.5 text-accent" />
            Recommended actions
          </h3>
          <ol className="space-y-1.5">
            {briefing.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#1f2937] leading-relaxed">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-accent/15 text-accent text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Sources */}
      {briefing.citations.length > 0 && (
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-bold text-[#374151] uppercase tracking-wider mb-2">
            <Newspaper className="w-3.5 h-3.5" />
            Sources
          </h3>
          <div className="space-y-1">
            {briefing.citations.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-[#35b779]/[0.05] transition-colors group"
              >
                <span className="mt-0.5 shrink-0 text-[10px] font-mono font-bold text-accent bg-accent/10 rounded px-1 py-0.5">
                  {c.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-[#1f2937] leading-snug group-hover:text-[#111827]">
                    {c.title}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[#9ca3af]">
                    {c.source}
                    {c.publishedAt && <span>· {c.publishedAt.slice(0, 10)}</span>}
                    <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10px] text-[#9ca3af] leading-snug pt-1">
        <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0" />
        AI-generated from live web sources + VinMap internal data. Verify against primary sources before acting.
      </p>
    </div>
  );
}
