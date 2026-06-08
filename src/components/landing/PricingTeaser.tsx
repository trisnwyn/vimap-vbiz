'use client';

import Link from 'next/link';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { PLAN_META } from '@/lib/subscription';
import type { Tier } from '@/types/subscription';
import Reveal from './Reveal';

const ORDER: Tier[] = ['free', 'analyst', 'professional', 'enterprise'];

export default function PricingTeaser() {
  return (
    <section id="pricing" className="py-20 sm:py-28 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-12">
          <p className="text-[11px] font-bold text-[#5f7138] uppercase tracking-[0.18em] mb-3">Pricing</p>
          <h2 className="font-display text-3xl sm:text-5xl font-light text-[#2a331a] leading-[1.08]">
            Start free. Upgrade when you need <em className="italic font-medium text-[#5f7138]">depth</em>.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ORDER.map((tier, i) => {
            const meta = PLAN_META[tier];
            const popular = tier === 'analyst';
            const onboarding = 'onboardingLabel' in meta ? meta.onboardingLabel : undefined;
            return (
              <Reveal key={tier} delay={i * 70}>
                <div
                  className={`relative h-full rounded-2xl p-5 flex flex-col ${
                    popular ? 'border-2 border-[#5f7138]/45 bg-white/70' : 'border border-[#5f7138]/15 bg-white/45'
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#5f7138] text-[#f4f0e6] uppercase tracking-wider">
                      Popular
                    </span>
                  )}
                  <div className="font-display text-lg font-medium text-[#2a331a]">
                    {meta.icon} {meta.name}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-medium text-[#2a331a]">{meta.priceLabel}</span>
                    {meta.unit && <span className="text-[11px] text-[#9ca3af]">{meta.unit}</span>}
                  </div>
                  {onboarding && <p className="text-[10px] text-[#A32D2D] mt-1">{onboarding}</p>}
                  <p className="text-[12px] text-[#6b7280] mt-1.5 leading-snug min-h-[32px]">{meta.description}</p>

                  <ul className="mt-3 space-y-1.5 flex-1">
                    {meta.highlights.slice(0, 4).map((h) => (
                      <li key={h} className="flex items-start gap-1.5 text-[12px] text-[#4a5230]">
                        <Check className="w-3.5 h-3.5 text-[#5f7138] shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* AI add-on note */}
        <Reveal className="mt-4">
          <div className="flex items-center gap-2 rounded-xl border border-[#854F0B]/20 bg-[#FAEEDA]/40 px-4 py-2.5">
            <Sparkles className="w-4 h-4 text-[#854F0B] shrink-0" />
            <p className="text-[12px] text-[#6b5328]">
              <span className="font-semibold text-[#854F0B]">Optional AI add-on</span> — attach Midori&rsquo;s AI suite to any
              paid tier (from +0.3M ₫ / user · year). Included on Enterprise.
            </p>
          </div>
        </Reveal>

        <div className="mt-8">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#5f7138] link-underline">
            Full comparison
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
