'use client';

import Link from 'next/link';
import { ArrowRight, Leaf } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';
import { LANDING_IMAGES } from './assets';

const STATS: { value: number; decimals?: number; prefix?: string; suffix?: string; label: string }[] = [
  { value: 19.74, decimals: 2, suffix: 'M ha', label: 'Forest cover tracked' },
  { value: 63, label: 'Provinces' },
  { value: 2.3, decimals: 1, prefix: '€', suffix: 'B', label: 'EU trade exposure' },
  { value: 24, suffix: ' yrs', label: 'Of satellite history' },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32 pb-12">
      {/* forest backdrop + cream scrim (keeps the dark serif text legible) */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LANDING_IMAGES.forestHero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90 animate-ken-burns"
        />
        {/* moderate veil so forest texture stays visible */}
        <div className="absolute inset-0 bg-[#faf8f3]/55" />
        {/* cream halo behind the headline for legibility */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_52%_at_50%_36%,rgba(250,248,243,0.88)_0%,rgba(250,248,243,0.4)_55%,transparent_78%)]" />
        {/* fade to solid cream before the map screenshot */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#faf8f3]" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(95,113,56,0.10)_0%,transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 glass-pill px-3.5 py-1.5 mb-7 animate-fade-in">
          <Leaf className="w-3.5 h-3.5 text-[#5f7138]" />
          <span className="text-[12px] font-medium text-[#4a5230]">Vietnam land-use &amp; cover intelligence</span>
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-light text-[#2a331a] leading-[1.02] animate-fade-in">
          See Vietnam&rsquo;s land,
          <br />
          <em className="italic font-medium text-[#5f7138]">clearly.</em>
        </h1>

        <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg text-[#4a5230]/85 leading-relaxed animate-fade-in">
          Forest cover, deforestation, live fire activity and EUDR risk across all 63 provinces —
          read for you by <span className="font-semibold text-[#2a331a]">Midori</span>, an AI sustainability analyst.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-full text-sm font-semibold text-[#f4f0e6] bg-[#5f7138] hover:bg-[#4a5a2b] transition-all hover:-translate-y-0.5 w-full sm:w-auto justify-center shadow-[0_8px_24px_rgba(74,90,43,0.25)]"
          >
            Explore the map — free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 h-12 rounded-full text-sm font-semibold text-[#4a5230] border border-[#5f7138]/25 hover:bg-[#5f7138]/[0.06] transition-all w-full sm:w-auto justify-center"
          >
            View pricing
          </Link>
        </div>
        <p className="mt-3 text-[12px] text-[#6b7280] animate-fade-in">No signup required · Free province-level access</p>
      </div>

      {/* Hero map image block with animated overlays */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 mt-14">
        <div className="relative rounded-[28px] overflow-hidden border border-[#5f7138]/15 shadow-[0_30px_80px_-30px_rgba(74,90,43,0.4)] ring-1 ring-black/[0.03]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LANDING_IMAGES.heroMap}
            alt="VinMap — Vietnam forest & land-use intelligence map"
            className="w-full h-auto block"
          />
          {/* faint top sheen so the screenshot sits in the page */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10" />
        </div>

        {/* animated stat strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#5f7138]/12 bg-white/55 px-4 py-3.5 text-left">
              <div className="font-display text-2xl sm:text-3xl font-medium text-[#2a331a]">
                <AnimatedCounter value={s.value} decimals={s.decimals ?? 0} prefix={s.prefix ?? ''} suffix={s.suffix ?? ''} />
              </div>
              <div className="text-[12px] text-[#6b7280] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
