// ─────────────────────────────────────────────────────────────────────────
// VinMap Intelligence — agent orchestrator.
//
// `runIntelAgent` is an async generator that drives the whole research loop
// and yields AgentEvent objects as it goes. A Route Handler turns those into
// an SSE stream; the UI renders them as a live "agent thinking" feed.
//
// Pipeline:  plan → gather (web) → read (internal tools) → cross-reference →
//            synthesize (LLM) → done
//
// Design rules:
//   • Every stage is wrapped so a failure degrades (emit a note + continue)
//     rather than crashing the stream.
//   • LLM calls are optional: without GROQ_API_KEY we fall back to
//     deterministic planning + a rule-based briefing, so the demo always works.
//   • Nothing here touches the DOM or React — it's pure data + fetch.
// ─────────────────────────────────────────────────────────────────────────

import type {
  AgentEvent,
  AgentEventType,
  AgentPhase,
  Briefing,
  BusinessProfile,
  Citation,
  RiskItem,
  Topic,
} from '@/types/intel';
import { getSearchProvider, type SearchResult } from './searchProvider';
import { provinces } from '@/data/provinces';
import {
  bucketFiresToProvinces,
  getActiveFires,
  getNationalSummary,
  getTopRiskProvinces,
  getVietnamForestArea,
  type NationalSummary,
  type ProvinceStat,
} from './tools';
import {
  fallbackQueries,
  PLANNER_SYSTEM,
  planningPrompt,
  profileSummary,
  SYNTH_SYSTEM,
  synthesisPrompt,
} from './prompts';

// ── Groq config ─────────────────────────────────────────────────────────
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PLANNER_MODEL = 'llama-3.1-8b-instant';
const SYNTH_MODEL = 'llama-3.3-70b-versatile';

export interface RunIntelOptions {
  /** Analysis year context (defaults to current year). */
  year?: number;
  /** Abort signal from the HTTP request. */
  signal?: AbortSignal;
  /**
   * Agentic Research mode: a specific user question. When set, the plan and the
   * synthesized briefing are scoped to answering it rather than a broad briefing.
   */
  question?: string;
}

// ── small event helpers ───────────────────────────────────────────────────

let _seq = 0;
function evt(
  phase: AgentPhase,
  type: AgentEventType,
  message: string,
  extra: Partial<AgentEvent> = {},
): AgentEvent {
  return {
    id: `e${Date.now().toString(36)}_${(_seq++).toString(36)}`,
    phase,
    type,
    message,
    timestamp: Date.now(),
    ...extra,
  };
}

/** Strip ```json fences and parse, tolerating leading/trailing prose. */
function parseJsonLoose<T>(raw: string): T | null {
  const cleaned = raw
    .replace(/```json?/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the first {...} or [...] block.
    const match = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function groqChat(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<string | null> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: opts.temperature ?? 0.6,
      max_tokens: opts.maxTokens ?? 2200,
    }),
    signal: opts.signal,
  });
  if (!res.ok) {
    console.error('[intel/agent] Groq error', model, res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  return (data?.choices?.[0]?.message?.content as string | undefined) ?? null;
}

// ── stage 1: plan ───────────────────────────────────────────────────────

interface Plan {
  focus: string;
  queries: string[];
}

async function makePlan(
  profile: BusinessProfile,
  year: number,
  apiKey: string | undefined,
  signal?: AbortSignal,
  question?: string,
): Promise<{ plan: Plan; usedLLM: boolean }> {
  const fallback: Plan = {
    focus: question
      ? `Answering: ${question}`
      : `Recent developments affecting a ${profile.role} dealing in ${profile.commodities.join(', ') || 'agri-commodities'}.`,
    queries: fallbackQueries(profile, year, question),
  };
  if (!apiKey) return { plan: fallback, usedLLM: false };

  try {
    const raw = await groqChat(apiKey, PLANNER_MODEL, PLANNER_SYSTEM, planningPrompt(profile, year, question), {
      temperature: 0.5,
      maxTokens: 600,
      signal,
    });
    if (!raw) return { plan: fallback, usedLLM: false };
    const parsed = parseJsonLoose<Plan>(raw);
    if (!parsed || !Array.isArray(parsed.queries) || parsed.queries.length === 0) {
      return { plan: fallback, usedLLM: false };
    }
    return {
      plan: {
        focus: typeof parsed.focus === 'string' && parsed.focus.trim() ? parsed.focus.trim() : fallback.focus,
        queries: parsed.queries.filter((q) => typeof q === 'string' && q.trim()).slice(0, 6),
      },
      usedLLM: true,
    };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    return { plan: fallback, usedLLM: false };
  }
}

// ── stage 2: gather (web) ─────────────────────────────────────────────────

/** Normalize a URL for dedup (drop tracking + trailing slash). */
function urlKey(u: string): string {
  try {
    const url = new URL(u);
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return u;
  }
}

// ── rule-based briefing (no-LLM fallback) ─────────────────────────────────

function buildFallbackBriefing(
  profile: BusinessProfile,
  year: number,
  national: NationalSummary,
  topRisk: ProvinceStat[],
  fireNote: string,
  worldBankNote: string,
  citations: Citation[],
): Briefing {
  const worst = topRisk[0];
  const cityIds = citations.slice(0, 3).map((c) => c.id);
  const eudrExposed =
    profile.markets.includes('eu') ||
    profile.concerns.includes('eudr') ||
    profile.commodities.some((c) => ['coffee', 'rubber', 'timber'].includes(c));

  const topics: Topic[] = [];
  if (eudrExposed) {
    topics.push({
      id: 't1',
      title: 'EUDR due-diligence exposure',
      summary: `Deforestation after 31 Dec 2020 in ${profile.commodities.join('/') || 'covered commodity'} areas triggers EU Regulation 2023/1115 obligations. National loss is running at ${national.avgLossRatePct}/yr across ${national.provinceCount} provinces in scope.`,
      category: 'eudr',
      severity: national.highRiskCount > 0 ? 'high' : 'medium',
      relevance: 'You sell into the EU and/or flagged EUDR — geolocated plot data is your gating requirement.',
      citationIds: cityIds.slice(0, 1),
    });
  }
  if (worst) {
    topics.push({
      id: `t${topics.length + 1}`,
      title: `${worst.name} is your highest-loss sourcing region`,
      summary: `${worst.name} (${worst.region}, ${worst.primaryCrop}) shows a ${worst.lossRatePct}/yr loss rate and ${worst.coverChangePct.toFixed(1)}% cover change since 2000.`,
      category: 'deforestation',
      severity: worst.lossRate >= 0.015 ? 'critical' : 'high',
      relevance: 'This province sits in or near your sourcing footprint, so it drives your compliance risk.',
      citationIds: [],
    });
  }
  topics.push({
    id: `t${topics.length + 1}`,
    title: 'Live fire & land-clearing signal',
    summary: fireNote,
    category: 'climate',
    severity: 'medium',
    relevance: 'Active fires near sourcing areas are an early indicator of clearing and harvest-season risk.',
    citationIds: [],
  });

  const risks: RiskItem[] = [
    {
      label: 'EUDR compliance',
      score: eudrExposed ? Math.min(95, 55 + national.highRiskCount * 4) : 30,
      trend: year > 2024 ? 'up' : 'flat',
      rationale: eudrExposed
        ? 'EU market exposure plus measurable post-2020 loss in scope.'
        : 'Limited EU exposure based on your declared markets.',
    },
    {
      label: 'Deforestation in sourcing area',
      score: Math.min(95, Math.round(national.avgLossRate * 100 * 30) + national.highRiskCount * 5),
      trend: 'up',
      rationale: `${national.highRiskCount} province(s) in scope exceed the 1.5%/yr high-risk threshold.`,
    },
    {
      label: 'Supply disruption',
      score: profile.concerns.includes('supply') ? 65 : 45,
      trend: 'flat',
      rationale: 'Weather and logistics pressure typical for the sourcing window.',
    },
    {
      label: 'Price volatility',
      score: profile.concerns.includes('price') ? 70 : 50,
      trend: 'up',
      rationale: 'Tight supply and compliance costs keep prices sensitive.',
    },
  ];

  return {
    id: `bf_${Date.now().toString(36)}`,
    generatedAt: Date.now(),
    language: profile.language,
    headline: `${profile.commodities[0] ? profile.commodities[0][0].toUpperCase() + profile.commodities[0].slice(1) : 'Commodity'} risk brief — ${national.avgLossRatePct} avg loss, ${national.highRiskCount} hotspot province(s)`,
    executiveSummary: `Across ${national.provinceCount} provinces in your scope, forest cover is ${(national.totalForest / 1e6).toFixed(2)}M ha with annual loss of ${(national.totalLoss / 1e3).toFixed(1)}K ha (${national.avgLossRatePct}/yr). ${worst ? `${worst.name} leads risk at ${worst.lossRatePct}.` : ''} ${eudrExposed ? 'Your EU exposure makes geolocated, post-2020-clean plot data the priority.' : 'Focus on the highest-loss provinces in your footprint.'}`,
    forProfile: {
      role: profile.role,
      commodities: profile.commodities,
      markets: profile.markets,
    },
    topics,
    sections: [
      {
        heading: 'Internal forest data',
        body: `Scope: ${national.scope} (${national.provinceCount} provinces). Total cover ${(national.totalForest / 1e6).toFixed(2)}M ha; loss ${(national.totalLoss / 1e3).toFixed(1)}K ha/yr; average rate ${national.avgLossRatePct}. ${worldBankNote}`,
        citationIds: [],
      },
      {
        heading: 'What to do next',
        body: 'Prioritize plot-level geolocation for your highest-loss sourcing provinces, lock in supplier deforestation-free attestations, and monitor active-fire alerts through harvest season.',
        citationIds: [],
      },
    ],
    risks,
    recommendations: [
      eudrExposed
        ? 'Collect GPS polygons for every sourcing plot and screen them against post-2020 forest loss before the next EU shipment.'
        : 'Map your top sourcing provinces against the loss data and flag any above 1.5%/yr.',
      worst
        ? `Audit suppliers in ${worst.name} first — it carries your highest loss rate.`
        : 'Audit your highest-loss province first.',
      'Subscribe to active-fire alerts for your sourcing bounding box during the dry season.',
      'Keep certification and chain-of-custody documents current to shorten buyer due-diligence cycles.',
    ],
    citations,
  };
}

/** Coerce a parsed LLM briefing into a valid Briefing, filling gaps. */
function normalizeBriefing(
  raw: Record<string, unknown>,
  profile: BusinessProfile,
  citations: Citation[],
  fallback: Briefing,
): Briefing {
  const validCitationIds = new Set(citations.map((c) => c.id));
  const filterIds = (ids: unknown): string[] =>
    Array.isArray(ids) ? ids.filter((i): i is string => typeof i === 'string' && validCitationIds.has(i)) : [];

  const topics: Topic[] = Array.isArray(raw.topics)
    ? (raw.topics as Record<string, unknown>[]).slice(0, 6).map((t, i) => ({
        id: `t${i + 1}`,
        title: String(t.title ?? 'Topic'),
        summary: String(t.summary ?? ''),
        category: (t.category as Topic['category']) ?? 'policy',
        severity: (t.severity as Topic['severity']) ?? 'medium',
        relevance: String(t.relevance ?? ''),
        citationIds: filterIds(t.citationIds),
      }))
    : fallback.topics;

  const sections = Array.isArray(raw.sections)
    ? (raw.sections as Record<string, unknown>[]).slice(0, 6).map((s) => ({
        heading: String(s.heading ?? ''),
        body: String(s.body ?? ''),
        citationIds: filterIds(s.citationIds),
      }))
    : fallback.sections;

  const risks: RiskItem[] = Array.isArray(raw.risks)
    ? (raw.risks as Record<string, unknown>[]).slice(0, 8).map((r) => ({
        label: String(r.label ?? 'Risk'),
        score: Math.max(0, Math.min(100, Number(r.score) || 0)),
        trend: (['up', 'down', 'flat'].includes(r.trend as string) ? r.trend : 'flat') as RiskItem['trend'],
        rationale: String(r.rationale ?? ''),
      }))
    : fallback.risks;

  const recommendations = Array.isArray(raw.recommendations)
    ? (raw.recommendations as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 6)
    : fallback.recommendations;

  return {
    id: `bf_${Date.now().toString(36)}`,
    generatedAt: Date.now(),
    language: profile.language,
    headline: typeof raw.headline === 'string' && raw.headline.trim() ? raw.headline.trim() : fallback.headline,
    executiveSummary:
      typeof raw.executiveSummary === 'string' && raw.executiveSummary.trim()
        ? raw.executiveSummary.trim()
        : fallback.executiveSummary,
    forProfile: { role: profile.role, commodities: profile.commodities, markets: profile.markets },
    topics: topics.length ? topics : fallback.topics,
    sections: sections.length ? sections : fallback.sections,
    risks: risks.length ? risks : fallback.risks,
    recommendations: recommendations.length ? recommendations : fallback.recommendations,
    citations,
  };
}

// ── main generator ─────────────────────────────────────────────────────────

export async function* runIntelAgent(
  profile: BusinessProfile,
  opts: RunIntelOptions = {},
): AsyncGenerator<AgentEvent> {
  const year = opts.year ?? new Date().getFullYear();
  const signal = opts.signal;
  const question = opts.question?.trim() || undefined;
  const apiKey = process.env.GROQ_API_KEY;
  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  try {
    // ── PLAN ──────────────────────────────────────────────────────────────
    yield evt('planning', 'status', question ? 'Understanding your question…' : 'Reading your business profile…', {
      detail: question ?? profileSummary(profile),
    });
    throwIfAborted();

    const { plan, usedLLM } = await makePlan(profile, year, apiKey, signal, question);
    yield evt('planning', 'thought', usedLLM ? 'Planned a focused research pass.' : 'Using a deterministic research plan.', {
      detail: plan.focus,
    });

    // ── GATHER (web) ────────────────────────────────────────────────────────
    yield evt('searching', 'status', `Searching the web across ${plan.queries.length} angles…`);
    const provider = getSearchProvider();
    const citations: Citation[] = [];
    const seenUrls = new Set<string>();

    for (const query of plan.queries) {
      throwIfAborted();
      yield evt('searching', 'query', `Searching: "${query}"`, { detail: query });
      let results: SearchResult[] = [];
      try {
        results = await provider.search(query, { language: profile.language, limit: 6, signal });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err;
        yield evt('searching', 'thought', `Search failed for "${query}" — continuing.`);
        continue;
      }
      for (const r of results) {
        const key = urlKey(r.url);
        if (seenUrls.has(key)) continue;
        seenUrls.add(key);
        const id = `c${citations.length + 1}`;
        const citation: Citation = {
          id,
          title: r.title,
          url: r.url,
          source: r.source,
          publishedAt: r.publishedAt,
          snippet: r.snippet,
        };
        citations.push(citation);
        yield evt('reading', 'source', r.title, { detail: r.source, source: citation });
        if (citations.length >= 14) break;
      }
      if (citations.length >= 14) break;
    }

    yield evt('reading', 'status', `Collected ${citations.length} source(s) from the web.`, {
      detail: `${citations.length} sources`,
    });

    // ── READ (internal tools, in parallel) ───────────────────────────────────
    yield evt('analyzing', 'status', 'Cross-checking against VinMap forest, fire & World Bank data…');
    throwIfAborted();

    // Expand scope: if the question mentions a specific province by name, add it
    // so the data context is relevant to what was actually asked.
    const questionLower = (question ?? '').toLowerCase();
    const mentionedIds = questionLower
      ? provinces
          .filter(
            (p) =>
              questionLower.includes(p.name.toLowerCase()) ||
              questionLower.includes(p.nameVi.toLowerCase()) ||
              questionLower.includes(p.id.replace(/_/g, ' ')),
          )
          .map((p) => p.id)
      : [];
    const baseScope = profile.sourcingProvinces.length ? profile.sourcingProvinces : undefined;
    const scopeIds =
      mentionedIds.length > 0
        ? ([...new Set([...(baseScope ?? []), ...mentionedIds])] as string[])
        : baseScope;

    const [national, topRisk] = await Promise.all([
      getNationalSummary(year, scopeIds),
      getTopRiskProvinces(year, 6, scopeIds),
    ]);

    yield evt('analyzing', 'finding', `Scope: ${national.provinceCount} province(s), ${(national.totalForest / 1e6).toFixed(2)}M ha forest, ${national.avgLossRatePct}/yr loss.`, {
      detail: `${national.highRiskCount} high-risk province(s)`,
    });
    if (topRisk[0]) {
      yield evt('analyzing', 'finding', `Highest loss: ${topRisk[0].name} (${topRisk[0].primaryCrop}) at ${topRisk[0].lossRatePct}/yr.`);
    }

    // Live fire + World Bank in parallel (both degrade gracefully).
    const [fires, worldBank] = await Promise.all([
      getActiveFires(3, signal).catch(() => ({ available: false as const, count: 0, hotspots: [], days: 3 })),
      getVietnamForestArea(signal).catch(() => ({ available: false as const })),
    ]);

    let fireNote: string;
    if (fires.available) {
      const buckets = bucketFiresToProvinces(fires.hotspots, scopeIds);
      const inScope = buckets.reduce((s, b) => s + b.fires, 0);
      const topFire = buckets[0];
      fireNote = `${fires.count} VIIRS hotspot(s) over Vietnam in the last ${fires.days} day(s); ${inScope} near your scope${topFire ? ` (most in ${topFire.name}: ${topFire.fires})` : ''}.`;
      yield evt('analyzing', 'finding', fireNote, { detail: 'NASA FIRMS (live)' });
    } else {
      fireNote = `Live fire data unavailable (${'reason' in fires ? fires.reason : 'n/a'}).`;
      yield evt('analyzing', 'thought', fireNote);
    }

    let worldBankNote: string;
    if (worldBank.available && worldBank.latestKm2 && worldBank.latestYear) {
      worldBankNote = `World Bank: Vietnam forest area ${worldBank.latestKm2.toLocaleString()} km² (${worldBank.latestYear}).`;
      yield evt('analyzing', 'finding', worldBankNote, { detail: 'World Bank Open Data' });
    } else {
      worldBankNote = 'World Bank forest-area series unavailable.';
    }

    // ── CROSS-REFERENCE ──────────────────────────────────────────────────────
    yield evt('cross-referencing', 'thought', 'Connecting web developments to your sourcing footprint and live signals…');
    throwIfAborted();

    // ── SYNTHESIZE ────────────────────────────────────────────────────────────
    yield evt('synthesizing', 'status', question ? 'Composing your answer…' : 'Synthesizing your personalized briefing…');

    const fallbackBriefing = buildFallbackBriefing(
      profile,
      year,
      national,
      topRisk,
      fireNote,
      worldBankNote,
      citations,
    );

    let briefing: Briefing = fallbackBriefing;
    if (apiKey) {
      try {
        const raw = await groqChat(
          apiKey,
          SYNTH_MODEL,
          SYNTH_SYSTEM,
          synthesisPrompt({
            profile,
            year,
            national,
            topRisk,
            fireNote,
            worldBankNote,
            citations: citations.map((c) => ({
              id: c.id,
              title: c.title,
              source: c.source,
              publishedAt: c.publishedAt,
              snippet: c.snippet,
            })),
            question,
          }),
          { temperature: 0.55, maxTokens: 4500, signal },
        );
        const parsed = raw ? parseJsonLoose<Record<string, unknown>>(raw) : null;
        if (parsed) {
          briefing = normalizeBriefing(parsed, profile, citations, fallbackBriefing);
        } else {
          yield evt('synthesizing', 'thought', 'Model output unparseable — using structured fallback.');
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') throw err;
        yield evt('synthesizing', 'thought', 'Synthesis call failed — using structured fallback.');
      }
    } else {
      yield evt('synthesizing', 'thought', 'No LLM key configured — using structured rule-based briefing.');
    }

    // Stream the executive summary as tokens for the typing effect.
    const words = briefing.executiveSummary.split(/(\s+)/);
    for (const w of words) {
      throwIfAborted();
      yield evt('synthesizing', 'token', w);
    }

    yield evt('done', 'briefing', briefing.headline, { briefing });
    yield evt('done', 'status', 'Briefing ready.');
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      // Client disconnected — end quietly.
      return;
    }
    console.error('[intel/agent] fatal', err);
    yield evt('error', 'error', 'The intelligence run hit an unexpected error.', {
      detail: (err as Error)?.message,
    });
  }
}
