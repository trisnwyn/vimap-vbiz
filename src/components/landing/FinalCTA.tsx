'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Reveal from './Reveal';
import { LANDING_IMAGES } from './assets';

export default function FinalCTA() {
  return (
    <section className="relative">
      {/* Curved top divider */}
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="block w-full h-[60px] text-[#5f7138]" aria-hidden="true">
        <path d="M0 80 C360 0 1080 0 1440 80 L1440 0 L0 0 Z" fill="currentColor" fillOpacity="0.06" />
      </svg>

      <div className="relative overflow-hidden">
        {/* Landscape image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LANDING_IMAGES.forestCta}
          alt=""
          className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#faf8f3] via-[#eef1e3]/70 to-[#5f7138]/30" />

        <Reveal className="relative max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          <h2 className="font-display text-4xl sm:text-6xl font-light text-[#2a331a] leading-[1.05]">
            Start exploring Vietnam&rsquo;s
            <br />
            <em className="italic font-medium text-[#5f7138]">land intelligence</em>.
          </h2>
          <p className="mt-5 text-[#4a5230]/90 text-sm sm:text-base max-w-lg mx-auto">
            Open the map, set your profile, and let Midori brief you. Free to start — no signup.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 mt-9 px-7 h-12 rounded-full text-sm font-semibold text-[#f4f0e6] bg-[#5f7138] hover:bg-[#4a5a2b] transition-all hover:-translate-y-0.5 shadow-[0_10px_30px_rgba(74,90,43,0.3)]"
          >
            Explore the map — free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
