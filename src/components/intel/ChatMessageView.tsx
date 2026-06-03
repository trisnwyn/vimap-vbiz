'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ListChecks, AlertTriangle, ChevronDown, ChevronRight, Paperclip } from 'lucide-react';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { useIntelStream } from '@/hooks/useIntelStream';
import type { ChatMessage, Citation } from '@/types/intel';
import AgentActivityStream from './AgentActivityStream';
import MidoriAvatar from '../midori/MidoriAvatar';
import MidoriAnswerCard from '../midori/MidoriAnswerCard';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessageViewProps {
  message: ChatMessage;
  /** For assistant turns: the user text this is answering. */
  question?: string;
  /** Prior completed turns — gives CasualTurn multi-turn memory. */
  history?: ConversationTurn[];
  year: number;
  mode: 'rag' | 'agentic';
  /** Executive summary from the last agentic briefing — injected into RAG context. */
  lastBriefingSummary?: string;
  /** Called when the assistant turn completes (success or error). */
  onDone?: (patch: Partial<ChatMessage>) => void;
}

/** Collapsible citation list — collapsed to a count pill by default. */
function SourceList({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState(false);
  if (!citations.length) return null;
  return (
    <div className="mt-2">
      {/* Toggle pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#35b779]/[0.20] bg-[#35b779]/[0.05] hover:bg-[#35b779]/[0.10] transition-colors text-[11px] text-[#6b7280] hover:text-[#374151]"
      >
        <Paperclip className="w-3 h-3" />
        <span className="font-medium">{citations.length} source{citations.length !== 1 ? 's' : ''}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Expanded list */}
      {open && (
        <div className="mt-1.5 space-y-1">
          {citations.map((c) => (
            <a
              key={c.id}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-[#35b779]/[0.06] transition-colors group"
            >
              <span className="mt-0.5 shrink-0 text-[10px] font-mono font-bold text-accent bg-accent/10 rounded px-1 py-0.5">
                {c.id}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-[#1f2937] leading-snug group-hover:text-[#111827] line-clamp-2">
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
      )}
    </div>
  );
}

/** The agentic assistant turn — runs the full research pipeline for the question. */
function AgenticTurn({
  question,
  year,
  onDone,
}: {
  question: string;
  year: number;
  onDone?: (patch: Partial<ChatMessage>) => void;
}) {
  const { profile } = useBusinessProfile();
  const stream = useIntelStream();
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  // Start the stream once the profile is hydrated from localStorage.
  useEffect(() => {
    if (startedRef.current || !profile) return;
    startedRef.current = true;
    stream.run(profile, year, question);
    // question/year/stream are fixed per chat turn — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Signal parent when done or errored.
  useEffect(() => {
    if (doneRef.current) return;
    if (stream.status === 'done' && stream.briefing) {
      doneRef.current = true;
      onDone?.({
        content: stream.briefing.executiveSummary,
        citations: stream.briefing.citations,
      });
    } else if (stream.status === 'error') {
      doneRef.current = true;
      onDone?.({ content: stream.error ?? 'Research failed.' });
    }
  }, [stream.status, stream.briefing, stream.error, onDone]);

  const running = stream.status === 'running';

  return (
    <div className="space-y-3">
      {/* Live agent stream — expanded full-screen overlay while researching */}
      {running && stream.events.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center z-40 pointer-events-none">
          <div className="max-w-[640px] w-full rounded-t-2xl md:rounded-2xl bg-[#faf8f3]/97 backdrop-blur-md border border-[#35b779]/[0.20] shadow-2xl pointer-events-auto p-4">
            <div className="flex flex-col items-center text-center mb-3">
              <MidoriAvatar size="lg" gem state="thinking" />
              <p className="mt-2 text-[13px] font-semibold text-[#111827]">Midori is researching…</p>
            </div>
            <AgentActivityStream
              events={stream.events}
              phase={stream.phase}
              running={running}
              feedMaxHeight="max-h-[280px]"
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {stream.status === 'error' && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/[0.07] border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-600">{stream.error}</p>
        </div>
      )}

      {/* Answer */}
      {(stream.streamedSummary || stream.briefing) && (
        <MidoriAnswerCard streaming={running}>
          <p className="text-[13px] text-[#1f2937] leading-relaxed">
            {running ? stream.streamedSummary : (stream.briefing?.executiveSummary ?? stream.streamedSummary)}
          </p>

          {/* Recommendations */}
          {!running && stream.briefing && stream.briefing.recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-accent/15">
              <p className="flex items-center gap-1 text-[10px] font-semibold text-[#374151] uppercase tracking-wider mb-1.5">
                <ListChecks className="w-3 h-3 text-accent" />
                Recommended actions
              </p>
              <ol className="space-y-1">
                {stream.briefing.recommendations.slice(0, 4).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#374151] leading-relaxed">
                    <span className="mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full bg-accent/15 text-accent text-[9px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </MidoriAnswerCard>
      )}

      {/* Sources */}
      {!running && stream.briefing && stream.briefing.citations.length > 0 && (
        <SourceList citations={stream.briefing.citations} />
      )}
    </div>
  );
}

/** SSE events from /api/intel/chat */
type ChatSseEvent =
  | { type: 'chunk'; text: string }
  | { type: 'done'; answer: string }
  | { type: 'error'; message: string };

// Keep alias for back-compat
type RagSseEvent = ChatSseEvent;

/** The RAG assistant turn — calls /api/intel/chat and streams back word tokens. */
function RagTurn({
  question,
  year,
  lastBriefingSummary,
  onDone,
}: {
  question: string;
  year: number;
  lastBriefingSummary?: string;
  onDone?: (patch: Partial<ChatMessage>) => void;
}) {
  const { profile } = useBusinessProfile();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  // Start the fetch once the profile is hydrated from localStorage.
  // Using [profile] dep (not []) so the effect re-fires when profile goes
  // from null → actual value. startedRef prevents duplicate starts.
  // Note: dep-change effects are NOT double-invoked by React Strict Mode,
  // so the cleanup abort only fires on genuine unmount (navigating away).
  useEffect(() => {
    if (startedRef.current || !profile) return;
    startedRef.current = true;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/intel/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile, year, question, lastBriefingSummary }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const msg = res.ok ? 'No response stream.' : `Request failed (${res.status})`;
          setError(msg);
          if (!doneRef.current) { doneRef.current = true; onDone?.({ content: msg }); }
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAnswer = '';

        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, sep).trim();
            buffer = buffer.slice(sep + 2);
            if (!raw.startsWith('data:')) continue;
            const json = raw.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json) as RagSseEvent;
              if (evt.type === 'chunk') {
                fullAnswer += evt.text;
                setText((t) => t + evt.text);
              } else if (evt.type === 'done') {
                fullAnswer = evt.answer;
                setText(evt.answer);
                setDone(true);
                if (!doneRef.current) {
                  doneRef.current = true;
                  onDone?.({ content: evt.answer });
                }
              } else if (evt.type === 'error') {
                setError(evt.message);
                if (!doneRef.current) { doneRef.current = true; onDone?.({ content: evt.message }); }
              }
            } catch { /* skip malformed frame */ }
          }
        }

        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.({ content: fullAnswer || text });
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        const msg = (err as Error)?.message ?? 'Request failed.';
        setError(msg);
        if (!doneRef.current) { doneRef.current = true; onDone?.({ content: msg }); }
      }
    })();

    return () => controller.abort();
    // question/year/lastBriefingSummary are fixed per chat turn — intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <div className="rounded-xl border border-[#35b779]/[0.18] bg-white/60 p-3.5 space-y-2">
      {error && (
        <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-red-500/[0.07] border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-600">{error}</p>
        </div>
      )}
      {!error && (
        <p className="text-[13px] text-[#1f2937] leading-relaxed whitespace-pre-wrap">
          {text || <span className="text-[#9ca3af]">Searching your data…</span>}
          {!done && text && (
            <span className="inline-block w-1.5 h-4 align-middle bg-accent/70 ml-0.5 animate-pulse" />
          )}
        </p>
      )}
      {done && (
        <p className="text-[10px] text-[#9ca3af]">Grounded in VinMap internal data · No live web search</p>
      )}
    </div>
  );
}

/** Lightweight conversational turn — calls /api/intel/chat with casual:true, no pipeline. */
function CasualTurn({
  question,
  history,
  onDone,
}: {
  question: string;
  history?: ConversationTurn[];
  onDone?: (patch: Partial<ChatMessage>) => void;
}) {
  const { profile } = useBusinessProfile();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !profile) return;
    startedRef.current = true;

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/intel/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile, question, history: history ?? [], casual: true }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const msg = res.ok ? 'No response stream.' : `Request failed (${res.status})`;
          setError(msg);
          if (!doneRef.current) { doneRef.current = true; onDone?.({ content: msg }); }
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullAnswer = '';

        for (;;) {
          const { done: streamDone, value } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const raw = buffer.slice(0, sep).trim();
            buffer = buffer.slice(sep + 2);
            if (!raw.startsWith('data:')) continue;
            const json = raw.slice(5).trim();
            if (!json) continue;
            try {
              const evt = JSON.parse(json) as ChatSseEvent;
              if (evt.type === 'chunk') {
                fullAnswer += evt.text;
                setText((t) => t + evt.text);
              } else if (evt.type === 'done') {
                fullAnswer = evt.answer;
                setText(evt.answer);
                setDone(true);
                if (!doneRef.current) { doneRef.current = true; onDone?.({ content: evt.answer }); }
              } else if (evt.type === 'error') {
                setError(evt.message);
                if (!doneRef.current) { doneRef.current = true; onDone?.({ content: evt.message }); }
              }
            } catch { /* skip malformed frame */ }
          }
        }
        if (!doneRef.current) { doneRef.current = true; onDone?.({ content: fullAnswer || text }); }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        const msg = (err as Error)?.message ?? 'Request failed.';
        setError(msg);
        if (!doneRef.current) { doneRef.current = true; onDone?.({ content: msg }); }
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  return (
    <div className="rounded-xl border border-[#35b779]/[0.18] bg-white/60 p-3.5 space-y-2">
      {error && (
        <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-red-500/[0.07] border border-red-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-red-600">{error}</p>
        </div>
      )}
      {!error && (
        <p className="text-[13px] text-[#1f2937] leading-relaxed whitespace-pre-wrap">
          {text || <span className="text-[#9ca3af]">Thinking…</span>}
          {!done && text && (
            <span className="inline-block w-1.5 h-4 align-middle bg-accent/70 ml-0.5 animate-pulse" />
          )}
        </p>
      )}
    </div>
  );
}

export default function ChatMessageView({ message, question, history, year, mode, lastBriefingSummary, onDone }: ChatMessageViewProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-tr-md bg-accent text-white text-[13px] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant turn — always shown with Midori's avatar
  return (
    <div className="flex items-start gap-2.5">
      {/* Midori avatar */}
      <div className="mt-0.5">
        <MidoriAvatar size="sm" state={message.streaming ? 'thinking' : 'done'} />
      </div>
      <div className="flex-1 min-w-0 max-w-[calc(100%-2.5rem)] space-y-1">
        {/* Route by the mode stamped on this specific turn */}
        {(message.turnMode === 'research' || (!message.turnMode && mode === 'agentic')) && question && (
          <AgenticTurn
            question={question}
            year={year}
            onDone={onDone}
          />
        )}
        {message.turnMode === 'chat' && question && (
          <CasualTurn
            question={question}
            history={history}
            onDone={onDone}
          />
        )}
        {(!message.turnMode && mode === 'rag') && question && (
          <RagTurn
            question={question}
            year={year}
            lastBriefingSummary={lastBriefingSummary}
            onDone={onDone}
          />
        )}
      </div>
    </div>
  );
}
