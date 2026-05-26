'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface CheckoutButtonProps {
  tier: 'analyst' | 'professional';
  interval?: 'monthly' | 'yearly';
  label: string;
  className?: string;
}

export default function CheckoutButton({
  tier,
  interval = 'monthly',
  label,
  className = '',
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval }),
      });

      if (res.status === 401) {
        // Not signed in — send to Clerk sign-in, return to pricing
        router.push('/sign-in?redirect_url=/pricing');
        return;
      }

      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout error:', data.error);
        alert(data.error ?? 'Unable to start checkout. Check that Stripe price IDs are configured in .env.local.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-wait ${className}`}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {loading ? 'Redirecting…' : label}
    </button>
  );
}
