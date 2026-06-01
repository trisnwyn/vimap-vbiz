'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Trash2, Telescope, MessageCircle } from 'lucide-react';
import { useIntelChat, type ChatMode, type TurnMode } from '@/hooks/useIntelChat';
import { useLastBriefing } from '@/hooks/useLastBriefing';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import type { ChatMessage } from '@/types/intel';
import ChatMessageView from '../ChatMessageView';
import MidoriAvatar from '../../midori/MidoriAvatar';
import MidoriGreeting from '../../midori/MidoriGreeting';

interface ChatTabProps {
  mode: ChatMode;
  year: number;
  pendingQuery?: string | null;
  onQueryConsumed?: () => void;
}

const MODE_META = {
  agentic: {
    placeholder: 'What would you like to research?',
  },
  rag: {
    placeholder: 'What would you like to research?',
  },
} as const;

export default function ChatTab({ mode, year, pendingQuery, onQueryConsumed }: ChatTabProps) {
  const { messages, busy, send, completeTurn, clear } = useIntelChat();
  const { lastBriefing } = useLastBriefing();
  const { profile } = useBusinessProfile();
  const [draft, setDraft] = useState('');
  const [turnMode, setTurnMode] = useState<TurnMode>('research');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingFiredRef = useRef(false);

  const meta = MODE_META[mode];

  // Auto-send a pending query (e.g. from "Ask Midori") exactly once.
  useEffect(() => {
    if (!pendingQuery || pendingFiredRef.current || busy) return;
    pendingFiredRef.current = true;
    send(pendingQuery, 'research');
    onQueryConsumed?.();
  }, [pendingQuery, busy, send, onQueryConsumed]);

  // Reset the ref when pendingQuery clears so a new one can fire.
  useEffect(() => {
    if (!pendingQuery) pendingFiredRef.current = false;
  }, [pendingQuery]);

  // Auto-scroll to bottom when messages update.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, messages]);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft('');
    send(text, turnMode);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [draft, busy, send, turnMode]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Midori identity banner */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#35b779]/[0.15] bg-[#f5f0e8]/80">
        <MidoriAvatar size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-[#111827] leading-tight">Midori</p>
          <p className="text-[10px] text-[#6b7280] leading-none mt-0.5">Your dedicated research analyst</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            title="Clear conversation"
            className="shrink-0 p-1 rounded hover:bg-red-500/10 text-[#9ca3af] hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 && (
          <MidoriGreeting profile={profile} lastBriefing={lastBriefing ?? null} />
        )}

        {messages.map((msg, i) => {
          // Derive the question for each assistant turn from the preceding user message.
          const question = msg.role === 'assistant' && i > 0 ? messages[i - 1].content : undefined;

          // Conversation history: all completed turns before the current user question.
          // Capped at the 10 most recent messages to keep the payload small.
          const history =
            msg.role === 'assistant' && i >= 2
              ? messages
                  .slice(0, i - 1)
                  .filter((m) => m.content && !m.streaming)
                  .map((m) => ({ role: m.role, content: m.content }))
                  .slice(-10)
              : [];

          return (
            <ChatMessageView
              key={msg.id}
              message={msg}
              question={question}
              history={history}
              year={year}
              mode={mode}
              lastBriefingSummary={lastBriefing?.executiveSummary}
              onDone={(patch: Partial<ChatMessage>) => completeTurn(msg.id, patch)}
            />
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-[#35b779]/[0.12] px-3 py-3 bg-[#faf8f3]/90">
        {/* Mode toggle */}
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => setTurnMode('research')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              turnMode === 'research'
                ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                : 'text-[#9ca3af] hover:text-[#374151] border border-transparent'
            }`}
          >
            <Telescope className="w-3 h-3" />
            Research
          </button>
          <button
            onClick={() => setTurnMode('chat')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              turnMode === 'chat'
                ? 'bg-[#35b779]/15 text-[#35b779] border border-[#35b779]/30'
                : 'text-[#9ca3af] hover:text-[#374151] border border-transparent'
            }`}
          >
            <MessageCircle className="w-3 h-3" />
            Chat
          </button>
          <span className="ml-1 text-[10px] text-[#9ca3af]">
            {turnMode === 'research' ? 'Live web + data · full reasoning' : 'Base knowledge · fast reply'}
          </span>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            rows={1}
            placeholder={meta.placeholder ?? 'What would you like to research?'}
            className="flex-1 resize-none rounded-xl border border-[#35b779]/[0.20] bg-white/70 px-3 py-2.5 text-[13px] text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all disabled:opacity-50 max-h-[120px] leading-relaxed"
            style={{ minHeight: '42px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || busy}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(53,183,121,0.95) 0%, rgba(34,85,63,0.97) 100%)',
              boxShadow: '0 2px 8px rgba(53,183,121,0.25)',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-[#9ca3af] mt-1.5 px-1">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
