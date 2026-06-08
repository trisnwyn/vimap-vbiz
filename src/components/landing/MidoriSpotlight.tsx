'use client';

import Link from 'next/link';
import { ArrowRight, Quote } from 'lucide-react';
import MidoriAvatar from '@/components/midori/MidoriAvatar';
import Reveal from './Reveal';

export default function MidoriSpotlight() {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-[#eef1e3]/60">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[640px] h-[420px] rounded-full bg-[radial-gradient(ellipse,rgba(95,113,56,0.10)_0%,transparent_70%)]" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <Reveal className="grid md:grid-cols-[0.75fr_1.25fr] gap-10 sm:gap-14 items-center">
          {/* Portrait */}
          <div className="flex justify-center md:justify-start">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgba(95,113,56,0.22)_0%,transparent_70%)] blur-xl" />
              <MidoriAvatar size="xl" gem state="done" className="relative !w-44 !h-44" />
            </div>
          </div>

          {/* Copy + sample answer */}
          <div>
            <p className="text-[11px] font-bold text-[#5f7138] uppercase tracking-[0.18em] mb-2">Meet Midori</p>
            <h2 className="font-display text-3xl sm:text-5xl font-light text-[#2a331a] leading-[1.08] mb-4">
              Your dedicated <em className="italic font-medium text-[#5f7138]">research analyst</em>.
            </h2>
            <p className="text-[15px] text-[#4a5230]/85 leading-relaxed mb-6">
              A senior sustainability &amp; commodity intelligence analyst, built into VinMap. She produces
              rigorous, decision-grade briefings grounded only in the evidence — no fluff, just the read you need.
            </p>

            <div className="relative rounded-2xl border border-[#35b779]/30 bg-white/70 backdrop-blur p-4 pl-5 border-l-[3px] !border-l-[#35b779]">
              <span className="absolute top-3 right-4 inline-flex items-center gap-1 text-[10px] font-bold text-[#35b779] uppercase tracking-wider">
                <Quote className="w-3 h-3" /> Midori
              </span>
              <p className="text-[13.5px] text-[#2a331a] leading-relaxed pr-14">
                &ldquo;Coffee sourcing in the Central Highlands carries the highest exposure this quarter:
                Đắk Lắk and Gia Lai both exceed the 1.5%/yr loss threshold, and fire activity is rising ahead
                of the dry season. I&rsquo;d prioritise EUDR plot checks there before Q4.&rdquo;
              </p>
            </div>

            <Link
              href="/app?view=intel"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-[#5f7138] link-underline"
            >
              Ask Midori anything
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
