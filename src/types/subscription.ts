export type Tier = 'free' | 'analyst' | 'professional' | 'enterprise';

export interface Subscription {
  userId: string;
  tier: Tier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  aiAnalysesUsed: number;
  aiAnalysesResetAt: string;
}
