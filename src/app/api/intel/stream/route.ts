// ─────────────────────────────────────────────────────────────────────────
// POST /api/intel/stream  →  Server-Sent Events
//
// Streams the agent's reasoning loop (AgentEvent objects) to the client as it
// happens. Each event is one SSE `data:` frame. The browser consumes this via
// a ReadableStream reader (not EventSource, since we POST a profile body).
//
// Next note: Route Handlers run on Web Request/Response. We return a streaming
// Response built from a ReadableStream; POST handlers are never cached. On
// serverless this could be cut short by lambda timeouts, but we self-host on
// Node so long-lived handlers are fine.
// ─────────────────────────────────────────────────────────────────────────

import { runIntelAgent } from '@/lib/intel/agent';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { checkAiQuota, incrementAiUsage } from '@/lib/ai-quota';
import type { BusinessProfile, Language } from '@/types/intel';

// Long-running stream — opt out of static optimization, run on Node.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLES = new Set(['exporter', 'importer', 'roaster', 'trader', 'manufacturer', 'financier', 'ngo', 'other']);
const LANGS = new Set<Language>(['en', 'vi']);

/** Coerce arbitrary JSON into a safe BusinessProfile (defensive). */
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

export async function POST(req: Request): Promise<Response> {
  // ── parse body ──
  let body: { profile?: unknown; year?: unknown; question?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const profile = sanitizeProfile(body.profile);
  if (!profile) {
    return Response.json({ error: 'Missing or invalid business profile' }, { status: 400 });
  }
  if (profile.commodities.length === 0) {
    return Response.json({ error: 'Select at least one commodity' }, { status: 400 });
  }

  const year =
    typeof body.year === 'number' && body.year >= 2000 && body.year <= 2030
      ? body.year
      : new Date().getFullYear();

  // Optional Agentic Research question — trimmed + length-capped.
  const question =
    typeof body.question === 'string' && body.question.trim()
      ? body.question.trim().slice(0, 500)
      : undefined;

  // ── rate-limit: 6 intelligence runs / min / IP (heavier than /analyze) ──
  const ip = getClientIp(req);
  const rl = rateLimit(`${ip}:intel`, 6, 60_000);
  if (!rl.success) {
    return Response.json(
      { error: 'Too many intelligence runs. Please wait a moment before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rl.resetAt),
        },
      },
    );
  }

  // ── AI quota check ──
  const quota = await checkAiQuota();
  if (!quota.allowed) {
    return Response.json({ error: quota.reason ?? 'AI analysis quota exceeded.' }, { status: 402 });
  }

  // ── build the SSE stream ──
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      try {
        for await (const event of runIntelAgent(profile, { year, question, signal: req.signal })) {
          if (req.signal.aborted) break;
          send(event);
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('[intel/stream] stream error', err);
          send({
            id: `e_err_${Date.now().toString(36)}`,
            phase: 'error',
            type: 'error',
            message: 'The stream ended unexpectedly.',
            timestamp: Date.now(),
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
        if (quota.userId) await incrementAiUsage(quota.userId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable proxy buffering (nginx)
    },
  });
}
