// ─────────────────────────────────────────────────────────────────────────
// Prompt builders for the VinMap RAG chat (Ask tab).
//
// The RAG endpoint answers questions grounded ONLY in the structured VinMap
// internal data (province forest stats, summary, commodity breakdown) plus
// the user's saved business profile. No live web search.
// ─────────────────────────────────────────────────────────────────────────

import type { BusinessProfile } from '@/types/intel';
import type { NationalSummary, ProvinceStat } from './tools';
import { profileSummary } from './prompts';

export interface RagInputs {
  profile: BusinessProfile;
  year: number;
  question: string;
  national: NationalSummary;
  topRisk: ProvinceStat[];
  /** Per-commodity province breakdown for the user's declared commodities. */
  commodityStats: { commodity: string; provinces: ProvinceStat[] }[];
  /** Optional: executive summary of the last agentic briefing (phase 5+). */
  lastBriefingSummary?: string;
}

export const RAG_SYSTEM =
  'You are VinMap Intelligence\'s data analyst. Answer questions using ONLY the structured data provided — do not use general knowledge beyond what is explicitly in the data block. Be concrete; cite specific numbers from the data. Keep your answer to 2–4 paragraphs. If the data cannot answer the question, say so clearly and explain what data would be needed.';

function fmtProvinces(stats: ProvinceStat[], n = 5): string {
  return stats
    .slice(0, n)
    .map(
      (p) =>
        `  • ${p.name} (${p.region}, ${p.primaryCrop}): ${(p.forestCover / 1000).toFixed(1)}K ha cover, ${p.lossRatePct}/yr loss`,
    )
    .join('\n');
}

export function ragUserPrompt(inp: RagInputs): string {
  const { profile, year, question, national, topRisk, commodityStats, lastBriefingSummary } = inp;

  const topRiskBlock = fmtProvinces(topRisk, 6);

  const commodityBlock = commodityStats
    .map(({ commodity, provinces }) =>
      provinces.length
        ? `${commodity} — ${provinces.length} province(s):\n${fmtProvinces(provinces, 4)}`
        : `${commodity} — no matching provinces in dataset`,
    )
    .join('\n\n');

  const briefingBlock = lastBriefingSummary
    ? `\nLAST BRIEFING SUMMARY\n${lastBriefingSummary}\n`
    : '';

  return `USER PROFILE
${profileSummary(profile)}

DATA (VinMap internal, year ${year})
National scope: ${national.provinceCount} provinces
Total forest cover: ${(national.totalForest / 1_000_000).toFixed(2)}M ha
Annual loss: ${(national.totalLoss / 1_000).toFixed(1)}K ha/yr
Average loss rate: ${national.avgLossRatePct}
High-risk provinces (≥1.5%/yr): ${national.highRiskCount}

Top provinces by loss rate:
${topRiskBlock || '  (no data)'}

Commodity breakdown (user's commodities):
${commodityBlock || '  (no commodities specified)'}
${briefingBlock}
USER QUESTION
${question}

Answer directly using the data above. Be specific and quantitative.`;
}

/** Deterministic answer when no LLM key is configured. */
export function buildFallbackRagAnswer(inp: RagInputs): string {
  const { question, national, topRisk, commodityStats, year } = inp;
  const worst = topRisk[0];
  const lines: string[] = [
    `Based on VinMap internal data (year ${year}):`,
    '',
    `National scope: ${national.provinceCount} provinces, ${(national.totalForest / 1_000_000).toFixed(2)}M ha forest cover, ${national.totalLoss.toLocaleString()} ha/yr annual loss (avg rate ${national.avgLossRatePct}). ${national.highRiskCount} province(s) exceed the 1.5%/yr high-risk threshold.`,
  ];

  if (worst) {
    lines.push(
      ``,
      `Highest loss rate in scope: ${worst.name} (${worst.region}, ${worst.primaryCrop}) at ${worst.lossRatePct}/yr — ${(worst.forestCover / 1000).toFixed(1)}K ha cover remaining.`,
    );
  }

  for (const { commodity, provinces } of commodityStats.slice(0, 2)) {
    if (provinces.length) {
      lines.push(
        ``,
        `${commodity}: ${provinces.length} province(s). Highest loss: ${provinces[0].name} at ${provinces[0].lossRatePct}/yr.`,
      );
    }
  }

  lines.push(
    ``,
    `Note: this is a deterministic data summary (no AI key configured). For a personalized answer to "${question}", configure GROQ_API_KEY.`,
  );

  return lines.join('\n');
}
