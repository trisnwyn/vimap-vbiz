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
  analyst:      { aiAnalysis: 20,       savedAssessments: 5,        newsArticles: Infinity },
  professional: { aiAnalysis: Infinity, savedAssessments: 50,       newsArticles: Infinity },
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
// Prices are annual, in VND, aligned with the revenue model. AI is sold as an
// optional add-on (see AI_ADDON) rather than bundled into the base tiers.
// Internal tier KEYS stay free/analyst/professional/enterprise for billing &
// gating compatibility; the displayed names are the new model.
export const PLAN_META = {
  free: {
    name: 'Explorer',
    icon: '🌿',
    priceVnd: 0,
    priceLabel: 'Free',
    unit: '',
    description: 'Province-level insights — no account required',
    color: 'text-[#3B6D11]',
    badge: 'bg-[#EAF3DE] text-[#3B6D11] border-[#3B6D11]/20',
    highlights: [
      'Interactive map & province stats',
      'Forest-loss heatmap',
      'Time slider 2000–2024',
      '5 news articles',
    ],
  },
  analyst: {
    name: 'Individual',
    icon: '👤',
    priceVnd: 600_000,
    priceLabel: '0.6M ₫',
    unit: '/ user · year',
    description: 'For individual analysts & smallholders',
    color: 'text-[#185FA5]',
    badge: 'bg-[#E6F1FB] text-[#185FA5] border-[#185FA5]/25',
    highlights: [
      'Everything in Explorer',
      'Full live news feed',
      '3 parcel assessments / month',
      'Weather + soil real data',
      'Crop viability',
      '5 saved assessments',
      '3 PDF exports / month',
    ],
  },
  professional: {
    name: 'Org · SME',
    icon: '🏢',
    priceVnd: 3_000_000,
    priceLabel: '3M ₫',
    unit: '/ org · year',
    onboardingVnd: 15_000_000,
    onboardingLabel: '+15M ₫ onboarding (one-time)',
    description: 'For organizations & SMEs',
    color: 'text-[#854F0B]',
    badge: 'bg-[#FAEEDA] text-[#854F0B] border-[#854F0B]/25',
    highlights: [
      'Everything in Individual',
      'Unlimited parcel assessments',
      'EUDR compliance check',
      'Investment score + radar',
      'Unlimited PDF export',
      '50 saved assessments',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise · Gov',
    icon: '🏛️',
    priceVnd: 400_000_000,
    priceLabel: '~400M ₫',
    unit: '/ contract · year',
    description: 'Custom deployment for enterprise & government',
    color: 'text-[#534AB7]',
    badge: 'bg-[#EEEDFE] text-[#534AB7] border-[#534AB7]/25',
    highlights: [
      'Everything in Org',
      'Full AI suite included',
      'Unlimited API access',
      'Custom dashboard + local hosting',
      'Multi-supplier tracking',
      'Branded reports',
      'Dedicated SLA support',
    ],
  },
} as const;

// ── AI Add-on (optional — attaches to any paid tier) ────────────────────────
export const AI_ADDON = {
  analyst:      { vnd: 300_000,   label: '+0.3M ₫', unit: '/ user · year' },
  professional: { vnd: 1_500_000, label: '+1.5M ₫', unit: '/ org · year'  },
  enterprise:   { included: true, label: 'Included' },
} as const;

export const AI_ADDON_FEATURES = [
  'AI parcel flagging',
  'Natural-language queries on forest data',
  'Auto EUDR batch reports (Org+)',
  'Batch parcel scanning (Org+)',
  'API access — 500 calls / day (Org+)',
  'Investment Scorecard (Org+)',
] as const;
