// ─────────────────────────────────────────────────────────────────────────
// POST /api/intel/chat  →  Server-Sent Events (RAG mode)
//
// Answers a user question grounded solely in VinMap internal data + the
// user's business profile. No live web search. Emits SSE chunks so the
// client gets a typing effect, then a final `done` event with the full
// answer. Falls back to a deterministic data summary when GROQ_API_KEY is
// absent.
//
// SSE event shapes (JSON after "data: "):
//   { "type": "chunk", "text": " word" }   ← streamed word tokens
//   { "type": "done",  "answer": "..." }   ← full answer (always last)
//   { "type": "error", "message": "..." }  ← only on failure
// ─────────────────────────────────────────────────────────────────────────

import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { checkAiQuota, incrementAiUsage } from '@/lib/ai-quota';
import {
  getNationalSummary,
  getTopRiskProvinces,
  getProvincesByCommodity,
} from '@/lib/intel/tools';
import { RAG_SYSTEM, ragUserPrompt, buildFallbackRagAnswer, type RagInputs } from '@/lib/intel/chatPrompts';
import type { BusinessProfile, Commodity, Language } from '@/types/intel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CHAT_MODEL = 'llama-3.3-70b-versatile';

const ROLES = new Set(['exporter', 'importer', 'roaster', 'trader', 'manufacturer', 'financier', 'ngo', 'other']);
const LANGS = new Set<Language>(['en', 'vi']);

function sanitizeProfile(input: unknown): BusinessProfile | null {
  if (!input || typeof input !== 'object') return null;
  const p = input as Record<string, unknown>;
  if (typeof p.role !== 'string' || !ROLES.has(p.role)) return null;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 30) : [];
  return {
    companyName: typeof p.companyName === 'string' ? p.companyName.slice(0, 120) : undefined,
    role: p.role as BusinessProfile['role'],
    commodities: strArr(p.commodities) as BusinessProfile['commodities'],
    sourcingProvinces: strArr(p.sourcingProvinces),
    markets: strArr(p.markets) as BusinessProfile['markets'],
    concerns: strArr(p.concerns) as BusinessProfile['concerns'],
    language: typeof p.language === 'string' && LANGS.has(p.language as Language) ? (p.language as Language) : 'en',
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
  };
}

const MIDORI_CASUAL_SYSTEM =
  'You are Midori, a research analyst for VinMap (a Vietnam agri-market intelligence platform). ' +
  'In this casual chat mode, answer conversationally and concisely from your general knowledge. ' +
  'RULES: ' +
  '(1) No pleasantries — never say "Great question", "I\'d be happy to help", "Certainly", "Sure!", "Of course". ' +
  '(2) Keep casual exchanges to 1–3 sentences. Give more detail only when the question genuinely demands it. ' +
  '(3) If asked about real-time data, prices, or recent events you cannot verify, say so plainly. ' +
  '(4) Your register is direct and measured — analyst, not assistant. ' +
  '(5) DOMAIN SCOPE — you cover Vietnam agri-markets, forestry, commodities (coffee, rubber, rice, timber, shrimp, etc.), EUDR compliance, supply chains, and the user\'s business context. ' +
  'If a question is entirely outside this scope (e.g. coding puzzles, recipes, entertainment, math homework), ' +
  'decline in one sentence and redirect: "That\'s outside my focus — I cover Vietnam\'s agri-market intelligence. Anything in that space I can help with?"';

/** Shared SSE streaming helper — emits word-by-word typing effect then a done event. */
async function streamAnswer(answer: string, req: Request, quota: { userId?: string | null }): Promise<Response> {
  const encoder = new TextEncoder();
  const words = answer.split(/(\s+)/);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        for (const word of words) {
          if (req.signal.aborted) break;
          if (word) send({ type: 'chunk', text: word });
          await new Promise((r) => setTimeout(r, 18));
        }
        if (!req.signal.aborted) send({ type: 'done', answer });
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError')
          send({ type: 'error', message: 'Failed to stream answer.' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
        if (quota.userId) await incrementAiUsage(quota.userId);
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  // ── parse body ──
  let body: { profile?: unknown; question?: unknown; year?: unknown; lastBriefingSummary?: unknown; casual?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const profile = sanitizeProfile(body.profile);
  if (!profile) {
    return Response.json({ error: 'Missing or invalid business profile' }, { status: 400 });
  }

  const question =
    typeof body.question === 'string' && body.question.trim()
      ? body.question.trim().slice(0, 500)
      : null;
  if (!question) {
    return Response.json({ error: 'Missing question' }, { status: 400 });
  }

  const year =
    typeof body.year === 'number' && body.year >= 2000 && body.year <= 2030
      ? body.year
      : new Date().getFullYear();

  // ── rate-limit: 12 RAG calls / min / IP ──
  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:chat`, 12, 60_000);
  if (!rl.success) {
    return Response.json(
      { error: 'Too many requests. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  // ── AI quota check ──
  const quota = await checkAiQuota();
  if (!quota.allowed) {
    return Response.json({ error: quota.reason ?? 'AI analysis quota exceeded.' }, { status: 402 });
  }

  const casual = body.casual === true;

  // Sanitize conversation history — capped at 10 turns, role + content strings only.
  const safeHistory: { role: 'user' | 'assistant'; content: string }[] = [];
  if (Array.isArray(body.history)) {
    for (const turn of body.history.slice(-10)) {
      if (
        turn && typeof turn === 'object' &&
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string' && turn.content.trim()
      ) {
        safeHistory.push({ role: turn.role, content: turn.content.trim().slice(0, 1000) });
      }
    }
  }

  // ── CASUAL fast-path: base-knowledge chat, no data fetching ──
  if (casual) {
    const apiKey = process.env.GROQ_API_KEY;
    let answer: string;
    if (apiKey) {
      try {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages: [
              { role: 'system', content: MIDORI_CASUAL_SYSTEM },
              ...safeHistory,
              { role: 'user', content: question },
            ],
            temperature: 0.6,
            max_tokens: 400,
          }),
          signal: req.signal,
        });
        const data = res.ok ? await res.json() : null;
        answer = (data?.choices?.[0]?.message?.content as string | undefined)?.trim()
          ?? 'No response from the model.';
      } catch {
        answer = 'Unable to reach the AI service right now.';
      }
    } else {
      answer = 'Offline mode — no AI key configured. Switch to Research mode for VinMap data-backed answers.';
    }
    return streamAnswer(answer, req, quota);
  }

  // ── build data context (hydrated from GFW when key is available) ──
  const scopeIds = profile.sourcingProvinces.length ? profile.sourcingProvinces : undefined;
  const [national, topRisk, commodityStats] = await Promise.all([
    getNationalSummary(year, scopeIds),
    getTopRiskProvinces(year, 6, scopeIds),
    Promise.all(
      profile.commodities.slice(0, 4).map(async (c: Commodity) => ({
        commodity: c,
        provinces: await getProvincesByCommodity(c, year),
      })),
    ),
  ]);

  const lastBriefingSummary =
    typeof body.lastBriefingSummary === 'string' && body.lastBriefingSummary.trim()
      ? body.lastBriefingSummary.trim().slice(0, 1200)
      : undefined;

  const ragInputs: RagInputs = { profile, year, question, national, topRisk, commodityStats, lastBriefingSummary };

  // ── get answer ──
  const apiKey = process.env.GROQ_API_KEY;
  let answer: string;
  if (apiKey) {
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: 'system', content: RAG_SYSTEM },
            { role: 'user', content: ragUserPrompt(ragInputs) },
          ],
          temperature: 0.4,
          max_tokens: 800,
        }),
        signal: req.signal,
      });
      const data = res.ok ? await res.json() : null;
      const content = data?.choices?.[0]?.message?.content as string | undefined;
      answer = content?.trim() || buildFallbackRagAnswer(ragInputs);
    } catch {
      answer = buildFallbackRagAnswer(ragInputs);
    }
  } else {
    answer = buildFallbackRagAnswer(ragInputs);
  }

  // ── stream back as SSE word tokens ──
  return streamAnswer(answer, req, quota);
}
