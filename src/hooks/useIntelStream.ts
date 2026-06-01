'use client';

import { useCallback, useRef, useState } from 'react';
import type { AgentEvent, AgentPhase, Briefing, BusinessProfile } from '@/types/intel';

export type IntelStatus = 'idle' | 'running' | 'done' | 'error';

export interface IntelStreamState {
  status: IntelStatus;
  /** All events received so far, in order (token events excluded — see streamedSummary). */
  events: AgentEvent[];
  /** Current high-level phase for the progress indicator. */
  phase: AgentPhase | null;
  /** The completed briefing, once synthesized. */
  briefing: Briefing | null;
  /** Live-typed executive summary, assembled from `token` events. */
  streamedSummary: string;
  /** Human error message, if the run failed. */
  error: string | null;
}

const INITIAL: IntelStreamState = {
  status: 'idle',
  events: [],
  phase: null,
  briefing: null,
  streamedSummary: '',
  error: null,
};

/**
 * Drives POST /api/intel/stream and decodes its SSE frames into React state.
 *
 * We POST a profile (so EventSource is out) and read the response body as a
 * stream, splitting on the SSE record delimiter (`\n\n`) and JSON-parsing each
 * `data:` line into an AgentEvent. Token events are coalesced into
 * `streamedSummary` for the typing effect; everything else is appended to
 * `events` for the activity feed.
 */
export function useIntelStream() {
  const [state, setState] = useState<IntelStreamState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => (s.status === 'running' ? { ...s, status: 'idle' } : s));
  }, []);

  const run = useCallback(async (profile: BusinessProfile, year?: number, question?: string) => {
    // Cancel any in-flight run first.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL, status: 'running' });

    try {
      const res = await fetch('/api/intel/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, year, question }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let msg = `Request failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* non-JSON error */
        }
        setState((s) => ({ ...s, status: 'error', error: msg }));
        return;
      }
      if (!res.body) {
        setState((s) => ({ ...s, status: 'error', error: 'No response stream.' }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleEvent = (event: AgentEvent) => {
        setState((prev) => {
          if (event.type === 'token') {
            return { ...prev, streamedSummary: prev.streamedSummary + event.message, phase: event.phase };
          }
          if (event.type === 'briefing' && event.briefing) {
            return {
              ...prev,
              briefing: event.briefing,
              phase: event.phase,
              events: [...prev.events, event],
              // Prefer the authoritative summary from the briefing object.
              streamedSummary: event.briefing.executiveSummary,
            };
          }
          if (event.type === 'error') {
            return { ...prev, status: 'error', error: event.message, phase: 'error', events: [...prev.events, event] };
          }
          return { ...prev, phase: event.phase, events: [...prev.events, event] };
        });
      };

      // Read loop.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let sep: number;
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const rawRecord = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          const line = rawRecord.trim();
          if (!line.startsWith('data:')) continue;
          const json = line.slice(5).trim();
          if (!json) continue;
          try {
            handleEvent(JSON.parse(json) as AgentEvent);
          } catch {
            // Skip malformed frame, keep streaming.
          }
        }
      }

      setState((prev) =>
        prev.status === 'error' ? prev : { ...prev, status: 'done', phase: prev.phase ?? 'done' },
      );
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // user cancelled
      setState((s) => ({ ...s, status: 'error', error: (err as Error)?.message ?? 'Stream failed.' }));
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  return { ...state, run, abort, reset };
}
