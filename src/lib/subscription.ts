import type { Tier } from '@/types/subscription';

// ── Feature gates ──────────────────────────────────────────────────────────
export const FEATURE_TIERS = {
  landAssessment:   ['analyst', 'professional', 'enterprise'] as Tier[],
  aiAnalysis:       ['analyst', 'professional', 'enterprise'] as Tier[],
  fullNewsFeed:     ['analyst', 'professional', 'enterprise'] as Tier[],
  exportReport:     ['analyst', 'professional', 'enterprise'] as Tier[],
  savedAssessments: ['analyst', 'professional', 'enterprise'] as Tier[],
  apiAccess:        ['professional', 'enterprise'] as Tier[],
  bulkAssessment:   ['professional', 'enterprise'] as Tier[],
} as const;

export type Feature = keyof typeof FEATURE_TIERS;

export function canAccess(tier: Tier, feature: Feature): boolean {
  return (FEATURE_TIERS[feature] as Tier[]).includes(tier);
}

// ── Usage limits ───────────────────────────────────────────────────────────
export const LIMITS: Record<Tier, { aiAnalysis: number; savedAssessments: number; newsArticles: number }> = {
  free:         { aiAnalysis: 0,        savedAssessments: 0,        newsArticles: 5 },
  analyst:      { aiAnalysis: 20,       savedAssessments: 10,       newsArticles: Infinity },
  professional: { aiAnalysis: Infinity, savedAssessments: Infinity, newsArticles: Infinity },
  enterprise:   { aiAnalysis: Infinity, savedAssessments: Infinity, newsArticles: Infinity },
};

// ── Stripe price IDs ───────────────────────────────────────────────────────
export const STRIPE_PRICES = {
  analyst: {
    monthly: process.env.STRIPE_PRICE_ANALYST_MONTHLY ?? '',
    yearly:  process.env.STRIPE_PRICE_ANALYST_YEARLY  ?? '',
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    yearly:  process.env.STRIPE_PRICE_PRO_YEARLY  ?? '',
  },
} as const;

// ── Plan display metadata ──────────────────────────────────────────────────
export const PLAN_META = {
  free: {
    name: 'Explorer',
    price: { monthly: 0, yearly: 0 },
    description: 'Province-level insights, no account required',
    color: 'text-[#6b7280]',
    badge: 'bg-[#35b779]/[0.08] text-[#374151] border-[#35b779]/20',
    highlights: [
      'Province map & forest loss charts',
      'Time slider 2000–2024',
      '5 news articles',
      'Heatmap overlay',
    ],
  },
  analyst: {
    name: 'Analyst',
    price: { monthly: 39, yearly: 390 },
    description: 'Full parcel assessment & EUDR compliance',
    color: 'text-[#35b779]',
    badge: 'bg-[#35b779]/[0.12] text-[#35b779] border-[#35b779]/30',
    highlights: [
      'Everything in Explorer',
      'Unlimited parcel assessments',
      'Real weather + soil data',
      'EUDR compliance check',
      'Investment score & crop viability',
      'PDF export report',
      '20 AI analyses / month',
      '10 saved assessments',
    ],
  },
  professional: {
    name: 'Professional',
    price: { monthly: 99, yearly: 990 },
    description: 'Unlimited AI + API access for power users',
    color: 'text-blue-500',
    badge: 'bg-blue-500/[0.10] text-blue-600 border-blue-500/25',
    highlights: [
      'Everything in Analyst',
      'Unlimited AI analyses',
      'Unlimited saved assessments',
      'API access (500 calls/day)',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: { monthly: 0, yearly: 0 },
    description: 'Custom data, team seats, SLA',
    color: 'text-purple-500',
    badge: 'bg-purple-500/[0.10] text-purple-600 border-purple-500/25',
    highlights: [
      'Everything in Professional',
      'Team seats (up to 10)',
      'White-label PDF export',
      'Unlimited API calls',
      'Custom data integration',
      'Dedicated SLA support',
    ],
  },
} as const;
