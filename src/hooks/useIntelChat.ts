'use client';

import { useCallback, useState } from 'react';
import type { ChatMessage } from '@/types/intel';

export type ChatMode = 'rag' | 'agentic';
export type TurnMode = 'research' | 'chat';

let _seq = 0;
const mkId = () => `m${Date.now().toString(36)}_${(_seq++).toString(36)}`;

/**
 * Manages a single conversation thread. The actual streaming for each assistant
 * turn lives in `ChatMessageView` (agentic → SSE /api/intel/stream with a
 * question; rag → /api/intel/chat), so this hook only owns the message list and
 * a `busy` flag that gates the composer while a turn is in flight.
 */
export function useIntelChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);

  /** Append a user turn + an empty, streaming assistant turn. */
  const send = useCallback((text: string, turnMode: TurnMode = 'research') => {
    const q = text.trim();
    if (!q) return;
    const now = Date.now();
    const userMsg: ChatMessage = { id: mkId(), role: 'user', content: q, timestamp: now, turnMode };
    const assistantMsg: ChatMessage = {
      id: mkId(),
      role: 'assistant',
      content: '',
      timestamp: now,
      streaming: true,
      turnMode,
    };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setBusy(true);
  }, []);

  /** Called by an assistant turn when its run finishes (success or error). */
  const completeTurn = useCallback((id: string, patch: Partial<ChatMessage>) => {
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, ...patch, streaming: false } : msg)));
    setBusy(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setBusy(false);
  }, []);

  return { messages, busy, send, completeTurn, clear };
}
