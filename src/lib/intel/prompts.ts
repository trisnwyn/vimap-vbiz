// ─────────────────────────────────────────────────────────────────────────
// Prompt builders for the VinMap Intelligence agent.
//
// Everything here is profile-aware: the agent's plan, its synthesis, and its
// recommendations are all framed around the user's role, commodities, markets,
// and concerns. Keeping prompts in one file makes tone/format easy to tune.
// ─────────────────────────────────────────────────────────────────────────

import type { BusinessProfile, Language } from '@/types/intel';
import type { NationalSummary, ProvinceStat } from './tools';

const ROLE_LABEL: Record<string, string> = {
  exporter: 'exporter',
  importer: 'importer',
  roaster: 'roaster / processor',
  trader: 'commodity trader',
  manufacturer: 'manufacturer',
  financier: 'financier / investor',
  ngo: 'NGO / researcher',
  other: 'business',
};

const MARKET_LABEL: Record<string, string> = {
  eu: 'European Union',
  us: 'United States',
  china: 'China',
  japan: 'Japan',
  domestic: 'domestic Vietnam',
  other: 'other markets',
};

const CONCERN_LABEL: Record<string, string> = {
  eudr: 'EUDR compliance',
  price: 'price volatility',
  climate: 'climate & weather risk',
  supply: 'supply-chain disruption',
  reputation: 'reputation / ESG',
  certification: 'certification',
};

/** One-line, human description of the profile for embedding in prompts. */
export function profileSummary(p: BusinessProfile): string {
  const role = ROLE_LABEL[p.role] ?? p.role;
  const commodities = p.commodities.length ? p.commodities.join(', ') : 'agricultural commodities';
  const markets = p.markets.length ? p.markets.map((m) => MARKET_LABEL[m] ?? m).join(', ') : 'global markets';
  const concerns = p.concerns.length
    ? p.concerns.map((c) => CONCERN_LABEL[c] ?? c).join(', ')
    : 'general supply-chain risk';
  const company = p.companyName ? `${p.companyName}, a` : 'A';
  return `${company} Vietnam-focused ${role} dealing in ${commodities}, selling into ${markets}. Top concerns: ${concerns}.`;
}

const LANG_INSTRUCTION: Record<Language, string> = {
  en: 'Write all output in clear, professional English.',
  vi: 'Viết toàn bộ nội dung bằng tiếng Việt chuyên nghiệp, rõ ràng.',
};

// ── Planning ──────────────────────────────────────────────────────────────

export const PLANNER_SYSTEM =
  'You are the planning module of a commodity-intelligence agent. You output ONLY a JSON object. No markdown, no prose outside the JSON.';

/**
 * Asks the model to produce a focused set of web-search queries tailored to
 * the profile. When `question` is supplied (Agentic Research mode), the queries
 * are scoped to answering that specific question instead of a broad briefing.
 * Returns instructions for a JSON object:
 *   { "focus": string, "queries": string[] }
 */
export function planningPrompt(p: BusinessProfile, year: number, question?: string): string {
  const q = question?.trim();
  if (q) {
    return `Plan a focused web-research pass to answer this user's specific question.

USER PROFILE
${profileSummary(p)}
Analysis year context: ${year}.

USER QUESTION
"${q}"

Generate 3–5 high-signal news/search queries that surface the evidence needed to answer THIS question for THIS user. Stay tightly scoped to the question; pull in the user's commodities, markets or sourcing region only where they sharpen the search. Favour concrete, recent angles over generic terms.

Return ONLY this JSON:
{
  "focus": "one sentence describing what answering this question requires",
  "queries": ["query 1", "query 2", "..."]
}`;
  }

  return `Plan a web-research pass for this user:

${profileSummary(p)}
Analysis year context: ${year}.

Generate 4–6 high-signal news/search queries that surface the most decision-relevant developments for THIS user over the last ~6 months. Prioritise their stated concerns. Favour concrete, recent angles (regulation changes, price moves, weather/climate shocks, buyer requirements, certification, supply disruptions) over generic terms. Include Vietnam and the relevant commodity in most queries.

Return ONLY this JSON:
{
  "focus": "one sentence describing what this research pass is hunting for",
  "queries": ["query 1", "query 2", "..."]
}`;
}

/** Deterministic fallback queries when the planner LLM is unavailable. */
export function fallbackQueries(p: BusinessProfile, year: number, question?: string): string[] {
  const commodities = p.commodities.length ? p.commodities : (['coffee'] as const);
  const q = question?.trim();
  if (q) {
    const c = commodities[0];
    const trimmed = q.slice(0, 120);
    return Array.from(
      new Set([
        `Vietnam ${c} ${trimmed}`,
        `${trimmed} ${year}`,
        `Vietnam ${c} ${year} ${p.markets.includes('eu') || p.concerns.includes('eudr') ? 'EUDR' : 'export market'}`,
      ]),
    ).slice(0, 5);
  }

  const queries: string[] = [];
  for (const c of commodities.slice(0, 3)) {
    queries.push(`Vietnam ${c} ${year} export market`);
    if (p.concerns.includes('eudr') || p.markets.includes('eu')) {
      queries.push(`Vietnam ${c} EUDR deforestation regulation`);
    }
    if (p.concerns.includes('price')) queries.push(`Vietnam ${c} price ${year}`);
    if (p.concerns.includes('climate')) queries.push(`Vietnam ${c} drought weather harvest`);
    if (p.concerns.includes('supply')) queries.push(`Vietnam ${c} supply shortage logistics`);
  }
  // De-dup and cap.
  return Array.from(new Set(queries)).slice(0, 6);
}

// ── Synthesis ─────────────────────────────────────────────────────────────

export const SYNTH_SYSTEM =
  'You are Midori, a senior commodity & sustainability intelligence analyst for VinMap. ' +
  'You produce rigorous, decision-grade briefings grounded ONLY in the evidence provided. ' +
  'PERSONA RULES — follow these without exception: ' +
  '(1) Never open with pleasantries, affirmations, or filler phrases. Banned openers include "Great question", "I\'d be happy to help", "Certainly", "Sure!", "Of course", "Absolutely", "That\'s a great point". ' +
  '(2) Data sections — tables, raw numbers, cited statistics — stay dry, third-person, and precise. Do not attach "I" to a data point. ' +
  '(3) Interpretive and summary paragraphs may use first-person naturally: "I found", "I recommend watching", "I think the key risk here is…". ' +
  '(4) Your register is measured and direct — a senior analyst presenting findings, not a customer service agent. ' +
  'Every claim sourced from evidence must cite it by id (e.g. "c3"). You output ONLY a JSON object — no markdown, no code fences, no prose outside the JSON.';

export interface SynthesisInputs {
  profile: BusinessProfile;
  year: number;
  national: NationalSummary;
  topRisk: ProvinceStat[];
  fireNote: string;
  worldBankNote: string;
  /** Numbered web evidence the model may cite. */
  citations: { id: string; title: string; source: string; publishedAt?: string; snippet?: string }[];
  /** When set (Agentic Research mode), the briefing must directly answer this. */
  question?: string;
}

export function synthesisPrompt(inp: SynthesisInputs): string {
  const { profile, year, national, topRisk, fireNote, worldBankNote, citations } = inp;
  const lang = LANG_INSTRUCTION[profile.language];
  const question = inp.question?.trim();

  const evidenceBlock = citations.length
    ? citations
        .map(
          (c) =>
            `[${c.id}] ${c.title} — ${c.source}${c.publishedAt ? ` (${c.publishedAt.slice(0, 10)})` : ''}${
              c.snippet ? `\n      ${c.snippet.slice(0, 220)}` : ''
            }`,
        )
        .join('\n')
    : '(no web evidence retrieved — rely on internal data and clearly flag the gap)';

  const topRiskBlock = topRisk
    .slice(0, 6)
    .map((p) => `${p.name} (${p.region}, ${p.primaryCrop}): loss rate ${p.lossRatePct}, cover change ${p.coverChangePct.toFixed(1)}% since 2000`)
    .join('\n');

  const questionBlock = question
    ? `\nUSER QUESTION (answer this directly)\n"${question}"\n`
    : '';

  const task = question
    ? `Answer the user's question directly, specifically, and with evidence. "executiveSummary" MUST be a decision-grade answer to the question (not a generic overview); "headline" restates the answer's thrust in one line. Use "topics", "sections", "risks" and "recommendations" to support and extend that answer for THIS user's commodities, markets, and concerns. Connect web developments to the internal forest/fire data where relevant. Be concrete and quantitative. Attach citation ids only to claims actually supported by that evidence. ${lang}`
    : `Synthesize the above into a briefing that is specific to THIS user's commodities, markets, and concerns. Connect web developments to the internal forest/fire data where relevant. Be concrete and quantitative. Attach citation ids only to claims actually supported by that evidence. ${lang}`;

  return `Produce a personalized intelligence briefing for this user:

USER PROFILE
${profileSummary(profile)}
${questionBlock}
INTERNAL DATA (VinMap, year ${year})
- Scope: ${national.scope} (${national.provinceCount} provinces)
- Total forest cover: ${(national.totalForest / 1e6).toFixed(2)}M ha
- Annual forest loss: ${(national.totalLoss / 1e3).toFixed(1)}K ha/yr
- Average loss rate: ${national.avgLossRatePct}
- High-risk provinces (>1.5%/yr): ${national.highRiskCount}
Highest-risk in scope:
${topRiskBlock || '(none in scope)'}
- Live fire activity: ${fireNote}
- World Bank: ${worldBankNote}

WEB EVIDENCE (cite by id)
${evidenceBlock}

TASK
${task}

Return ONLY this JSON object:
{
  "headline": "punchy one-line headline for this user",
  "executiveSummary": "2–4 sentence summary of what matters most right now",
  "topics": [
    {
      "title": "short topic title",
      "summary": "2–3 sentences",
      "category": "eudr|deforestation|policy|climate|agriculture|price|supply",
      "severity": "critical|high|medium|low",
      "relevance": "one sentence on why this matters to THIS user",
      "citationIds": ["c1"]
    }
  ],
  "sections": [
    { "heading": "section heading", "body": "1 paragraph", "citationIds": ["c2"] }
  ],
  "risks": [
    { "label": "risk name", "score": 0-100, "trend": "up|down|flat", "rationale": "one sentence" }
  ],
  "recommendations": ["prioritized, profile-specific action", "..."]
}

Provide 3–5 topics, 2–4 sections, 4–6 risks, and 3–5 recommendations.`;
}
