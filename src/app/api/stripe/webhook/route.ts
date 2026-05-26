import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import type Stripe from 'stripe';

function getTierFromPriceId(priceId: string): string {
  const analystIds = [
    process.env.STRIPE_PRICE_ANALYST_MONTHLY ?? '',
    process.env.STRIPE_PRICE_ANALYST_YEARLY  ?? '',
  ];
  const proIds = [
    process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    process.env.STRIPE_PRICE_PRO_YEARLY  ?? '',
  ];
  if (analystIds.includes(priceId)) return 'analyst';
  if (proIds.includes(priceId))     return 'professional';
  return 'free';
}

async function upsertSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const priceId = sub.items.data[0]?.price.id ?? '';
  const tier = getTierFromPriceId(priceId);

  await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      tier,
      status: sub.status,
      current_period_end: new Date((sub.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await upsertSubscription(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ tier: 'free', status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', userId);
      }
      break;
    }

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));
        if (!sub.metadata?.userId && session.metadata?.userId) {
          await stripe.subscriptions.update(sub.id, {
            metadata: { userId: session.metadata.userId },
          });
          (sub.metadata as Record<string, string>).userId = session.metadata.userId;
        }
        await upsertSubscription(sub);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
