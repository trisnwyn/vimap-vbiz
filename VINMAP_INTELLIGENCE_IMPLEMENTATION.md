# VinMap Intelligence — Dashboard Implementation Plan

## Context

Today "VinMap Intelligence" is a single sidebar panel (`IntelligencePanel`) bolted onto the `ai` tab. It is being rearchitected into a **dedicated full-screen dashboard** that **replaces the "AI Insights" tab entirely**, with its own internal sub-tabs. This is the flagship AI feature — the hero moment is the **live agent reasoning stream**; personalization (business profile) and cited evidence run through everything.

**Decisions locked:**
1. **Navigation** — completely remove "AI Insights"; the 4th nav slot becomes **"VinMap Intelligence"** and opens a full-screen dashboard (map chrome hidden).
2. **Current Trends tab** — **agentic briefing + statistical forecast combined** (live stream + cited briefing + 2030 projection + charts).
3. **Chatbot** — split into **two** sub-tabs: a **RAG/Ask** mode (grounded in the user's own data, fast, no web) and an **Agentic Research** mode (per-question web+data agentic research with live reasoning).

**Resulting dashboard = 4 sub-tabs:** Current Trends · Ask (RAG) · Research (Agentic) · Company Profile.

---

## Architecture

### Top-level navigation
- `Tab` union `'stats' | 'news' | 'assess' | 'ai'` → **`'ai'` renamed to `'intelligence'`** in `page.tsx` and `Header.tsx`.
- Header 4th item: label "AI Insights" → **"VinMap Intelligence"** (keep `Sparkles` icon). Mobile tab bar 'AI' → 'Intel'.
- In `page.tsx`, add a **dedicated branch**: when `activeTab === 'intelligence'`, render `<IntelligenceDashboard>` full-bleed in the content region and **hide** `HeadlineStrip`, `AlertTicker`, map, `TimeSlider`, `Legend`, `BasemapSwitcher`, `ProvinceDetail`. Header stays.
- Header: hide map-only controls (layer toggles, basemap search, export, Map/Intel view switch) when `activeTab === 'intelligence'`.

### Dashboard shell — `IntelligenceDashboard.tsx`
- Full-height flex. **Left rail** (icon+label, vertical) on `md+`; **horizontal scroll tab bar** on mobile. 4 sub-tabs.
- **Profile gate**: if `!hasProfile`, render `BusinessProfileForm` (onboard) centered, ignoring sub-tab. On save → switch to Current Trends and auto-run the briefing.
- Sub-tab state local (`useState`), default `trends`.

### Sub-tab 1 — Current Trends (`dashboard/TrendsTab.tsx`)
- **Reuse** `useIntelStream` + `AgentActivityStream` (hero) + `BriefingView`. Run / Stop / Re-run controls.
- **New** `dashboard/ForecastSection.tsx` below the briefing: 2030 projection card (linear regression), risk scoreboard, `ForestLossChart`, `RegionChart`.
- Give `AgentActivityStream` more vertical room than the old 280px cap.

### Sub-tabs 2 & 3 — Chat (`dashboard/ChatTab.tsx`, prop `mode: 'rag' | 'agentic'`)
Shared chat UI (message list + composer + streaming), driven by `useIntelChat(mode)`.
- **Ask (RAG)** — fast, no web. Grounds each answer in: profile + internal structured data (`getNationalSummary`, `getTopRiskProvinces`, `getProvincesByCommodity`) + the last saved briefing. Single Groq call, server chunks the reply into token events for the typing effect.
- **Research (Agentic)** — reuses the **existing agent pipeline** seeded with the user's question: live `AgentActivityStream` inside the assistant turn + streamed cited answer.

### Sub-tab 4 — Company Profile (`dashboard/ProfileTab.tsx`)
- Profile summary card (`profileSummary`) + `BusinessProfileForm` (edit) inline + "Clear profile".
- Shows last-briefing timestamp (from `useLastBriefing`).

---

## File-by-file

### New files
| Path | Purpose |
|---|---|
| `src/components/intel/IntelligenceDashboard.tsx` | Shell: rail nav + profile gate + sub-tab router |
| `src/components/intel/dashboard/TrendsTab.tsx` | Agentic briefing + forecast |
| `src/components/intel/dashboard/ForecastSection.tsx` | 2030 projection, scoreboard, ForestLoss/Region charts |
| `src/components/intel/dashboard/ChatTab.tsx` | Shared chat UI for both modes |
| `src/components/intel/dashboard/ProfileTab.tsx` | Profile summary + edit form |
| `src/components/intel/ChatMessageView.tsx` | One chat turn (bubble + citations + optional agent stream) |
| `src/hooks/useIntelChat.ts` | Chat state + streaming |
| `src/hooks/useLastBriefing.ts` | Persist most recent briefing to localStorage |
| `src/lib/intel/forecast.ts` | `computeTrend`, `forecast2030`, `computeRiskScore`, `getForecastSummary` |
| `src/lib/intel/chatPrompts.ts` | RAG system/user prompt builders + agentic question prompts |
| `src/app/api/intel/chat/route.ts` | RAG chat SSE route (Groq + deterministic fallback, rate-limited) |

### Modified files
| Path | Change |
|---|---|
| `src/app/page.tsx` | Rename tab; full-screen dashboard branch; hide map chrome when active |
| `src/components/Header.tsx` | Rename 4th tab; hide map-only controls when `activeTab==='intelligence'` |
| `src/lib/intel/agent.ts` | Add `question?: string` to `RunIntelOptions`; question-aware plan + synthesis |
| `src/lib/intel/prompts.ts` | Question-aware planning + answer-focused synthesis variants |
| `src/app/api/intel/stream/route.ts` | Accept + sanitize optional `question`, pass to `runIntelAgent` |
| `src/hooks/useIntelStream.ts` | `run(profile, year?, question?)` |

### Deleted (after porting)
- `src/components/AIAnalysisPanel.tsx` — math ported to `forecast.ts`.
- `src/components/intel/IntelligencePanel.tsx` — main view absorbed into `TrendsTab`.

---

## Reuse map (don't rebuild)
- Hero stream: `AgentActivityStream.tsx`, `useIntelStream.ts`, `runIntelAgent` (agent.ts), SSE `stream/route.ts`.
- Briefing render: `BriefingView.tsx`, `RiskRadar.tsx`.
- Profile: `useBusinessProfile.ts`, `BusinessProfileForm.tsx`, `profileSummary` (prompts.ts).
- Data tools: `tools.ts`, `data/utils.ts`.
- Charts: `ForestLossChart.tsx`, `RegionChart.tsx`.
- Infra: `lib/rate-limit.ts`, `parseJsonLoose`/`groqChat` patterns.

## Constraints honored
- API keys server-only (`GROQ_API_KEY`, `FIRMS_MAP_KEY`); no client exposure; everything degrades to deterministic fallback with no key.
- localStorage-only profile + last briefing; no auth.
- New SSE chat route mirrors the existing compliant `stream/route.ts` (Web `Request`/`Response`, `ReadableStream`, `runtime='nodejs'`, `dynamic='force-dynamic'`).
- New dashboard components use accessible color shades (`-600/-700`, matching `BriefingView`).

---

## Build order
1. **Scaffold + nav** — rename tab, dashboard shell + rail + profile gate; sub-tabs render placeholders.
2. **Current Trends** — briefing view + `forecast.ts` + `ForecastSection`; delete `AIAnalysisPanel`/`IntelligencePanel`.
3. **Agentic Research tab** — extend agent/prompts/stream/hook for `question`; `ChatTab mode="agentic"` + `ChatMessageView`.
4. **Ask (RAG) tab** — `chatPrompts.ts`, `/api/intel/chat`, `useIntelChat` rag path, `ChatTab mode="rag"`.
5. **Company Profile tab** — `ProfileTab` + `useLastBriefing`; wire last-briefing into RAG context.
6. **Polish + verify** — empty/error/loading states, mobile rail, EN/VI passthrough, `npx tsc --noEmit`, lint.

## Verification
- `npx tsc --noEmit` clean after each phase.
- Manual test checklist: onboarding → auto-run briefing → forecast renders → agentic question streams sources+answer → RAG answer cites internal data → profile edit re-runs → no-key fallback path → mobile rail.
