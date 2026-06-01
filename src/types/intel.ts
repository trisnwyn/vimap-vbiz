// ─────────────────────────────────────────────────────────────────────────
// VinMap Intelligence — shared types
//
// These power the agentic research feature: a business profile drives a
// plan→gather→cross-reference→synthesize loop that emits a live reasoning
// stream (AgentEvent[]) and produces a personalized, cited Briefing.
// ─────────────────────────────────────────────────────────────────────────

// ── Business profile ──────────────────────────────────────────────────────
// Stored gate-free in localStorage (no auth). Everything the agent produces is
// personalized against this profile.

/** What the user *does* — shapes tone, risk weighting, and recommendations. */
export type BusinessRole =
  | 'exporter'
  | 'importer'
  | 'roaster'
  | 'trader'
  | 'manufacturer'
  | 'financier'
  | 'ngo'
  | 'other';

/** Commodities mirror the real `primaryCrop` values in src/data/provinces.ts
 *  so the agent can join a profile to province-level forest data. */
export type Commodity =
  | 'coffee'
  | 'rubber'
  | 'timber'
  | 'rice'
  | 'tea'
  | 'maize'
  | 'lychee'
  | 'grapes'
  | 'dragon fruit'
  | 'coconut'
  | 'shrimp';

/** Destination markets — EU/US carry EUDR & UKFRC-style due-diligence weight. */
export type Market = 'eu' | 'us' | 'china' | 'japan' | 'domestic' | 'other';

/** What keeps the user up at night — biases topic selection & risk radar. */
export type Concern =
  | 'eudr'
  | 'price'
  | 'climate'
  | 'supply'
  | 'reputation'
  | 'certification';

export type Language = 'en' | 'vi';

export interface BusinessProfile {
  companyName?: string;
  role: BusinessRole;
  commodities: Commodity[];
  /** Province ids (see src/data/provinces.ts) the user sources from. */
  sourcingProvinces: string[];
  markets: Market[];
  concerns: Concern[];
  language: Language;
  /** Epoch ms of last edit — used for cache keys & "profile updated" hints. */
  updatedAt: number;
}

// ── Citations & evidence ──────────────────────────────────────────────────
// Every finding the agent surfaces is backed by a Citation. The UI renders
// these as numbered, clickable sources so claims are auditable.

export interface Citation {
  id: string;
  title: string;
  /** Canonical article/source URL. */
  url: string;
  /** Publisher / outlet, e.g. "Reuters", "VnExpress", "Global Forest Watch". */
  source: string;
  /** ISO date string when known. */
  publishedAt?: string;
  /** Short extract that grounds the claim. */
  snippet?: string;
  /** 0–1 model-assessed relevance to the user's profile. */
  relevance?: number;
}

// ── Topics ────────────────────────────────────────────────────────────────
// A "hot topic" the agent discovered and clustered from web + internal data.

export type TopicCategory =
  | 'eudr'
  | 'deforestation'
  | 'policy'
  | 'climate'
  | 'agriculture'
  | 'price'
  | 'supply';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Topic {
  id: string;
  title: string;
  summary: string;
  category: TopicCategory;
  severity: Severity;
  /** Why this matters *to this user* given their profile. */
  relevance: string;
  /** Ids into the parent Briefing.citations array. */
  citationIds: string[];
}

// ── Risk radar ────────────────────────────────────────────────────────────

export interface RiskItem {
  /** e.g. "EUDR compliance", "Price volatility", "Supply disruption". */
  label: string;
  /** 0–100. Higher = more risk. */
  score: number;
  trend: 'up' | 'down' | 'flat';
  rationale: string;
}

// ── Briefing (final synthesized output) ───────────────────────────────────

export interface BriefingSection {
  heading: string;
  /** Markdown-ish body. May contain inline [n] citation markers. */
  body: string;
  citationIds: string[];
}

export interface Briefing {
  id: string;
  /** Epoch ms. */
  generatedAt: number;
  language: Language;
  headline: string;
  executiveSummary: string;
  /** Echoes the slice of profile this briefing was tailored to (for display). */
  forProfile: {
    role: BusinessRole;
    commodities: Commodity[];
    markets: Market[];
  };
  topics: Topic[];
  sections: BriefingSection[];
  risks: RiskItem[];
  /** Prioritized, profile-specific next actions. */
  recommendations: string[];
  citations: Citation[];
}

// ── Agent reasoning stream (the hero demo moment) ─────────────────────────
// The orchestrator emits these over SSE so the UI can show the agent
// "thinking" live: planning, searching, reading sources, cross-referencing,
// then synthesizing.

export type AgentPhase =
  | 'planning'
  | 'searching'
  | 'reading'
  | 'analyzing'
  | 'cross-referencing'
  | 'synthesizing'
  | 'done'
  | 'error';

export type AgentEventType =
  | 'status' // phase transition / high-level progress
  | 'thought' // model's reasoning narration
  | 'query' // a search query being issued
  | 'source' // a source discovered/read (carries `source`)
  | 'finding' // an intermediate insight
  | 'token' // streamed token of the final briefing text
  | 'briefing' // the completed Briefing object (carries `briefing`)
  | 'error';

export interface AgentEvent {
  id: string;
  phase: AgentPhase;
  type: AgentEventType;
  /** Human-readable line shown in the activity stream. */
  message: string;
  /** Optional secondary detail (e.g. a query string, a count). */
  detail?: string;
  /** Present when type === 'source'. */
  source?: Citation;
  /** Present when type === 'briefing'. */
  briefing?: Briefing;
  /** Epoch ms. */
  timestamp: number;
}

// ── Conversational analyst (Pillar 3) ─────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Sources the assistant grounded this answer in. */
  citations?: Citation[];
  /** Epoch ms. */
  timestamp: number;
  /** True while the assistant message is still streaming in. */
  streaming?: boolean;
  /**
   * Which mode was active when this turn was sent.
   * 'research' = full agentic pipeline (live web + data).
   * 'chat'     = lightweight Midori response from base knowledge, no pipeline.
   */
  turnMode?: 'research' | 'chat';
}
