import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { STRIPE_PRICES } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { tier: 'analyst' | 'professional'; interval: 'monthly' | 'yearly' };
  const { tier, interval } = body;

  const priceId = STRIPE_PRICES[tier]?.[interval];
  if (!priceId) return NextResponse.json({ error: 'Invalid plan — configure Stripe price IDs in .env.local' }, { status: 400 });

  // Get or create Stripe customer
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();

  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { userId } });
    customerId = customer.id;
  }

  const origin = req.headers.get('origin') ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?upgrade=success`,
    cancel_url: `${origin}/pricing?upgrade=canceled`,
    subscription_data: { metadata: { userId } },
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
