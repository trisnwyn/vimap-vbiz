'use client';

import { ShieldAlert, Flame, TrendingDown } from 'lucide-react';
import Reveal from './Reveal';
import { LANDING_IMAGES } from './assets';

function ImageBlock({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-[24px] overflow-hidden border border-[#5f7138]/15 shadow-[0_24px_60px_-30px_rgba(74,90,43,0.4)] bg-white/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-auto block" />
    </div>
  );
}

/** A live, animated replica of the in-app forecast verdict band. */
function VerdictBand() {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/[0.05] px-3 py-2.5 max-w-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-500/12 text-red-600">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className="text-sm font-bold text-red-700 leading-none">3 regions in danger</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-500/10 border border-orange-500/20 rounded-full px-1.5 py-0.5">
              <Flame className="w-2.5 h-2.5" /> 12 fires · Đắk Lắk
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {[{ n: 'Đắk Lắk', v: '1.82%' }, { n: 'Gia Lai', v: '1.61%' }, { n: 'Kon Tum', v: '1.48%' }].map((c) => (
              <span key={c.n} className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md border px-1.5 py-0.5 bg-red-500/10 text-red-700 border-red-500/25">
                {c.n}<span className="font-mono opacity-70">{c.v}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <div className="flex items-center justify-end gap-1 text-[10px] text-[#6b7280]">
            <TrendingDown className="w-2.5 h-2.5 text-red-500" /> 2030 −2.1%
          </div>
          <div className="text-[9px] text-[#9ca3af] mt-1 uppercase tracking-wider">Updated 8s ago</div>
        </div>
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <p className="text-[11px] font-bold text-[#5f7138] uppercase tracking-[0.18em] mb-3">See it in action</p>
          <h2 className="font-display text-3xl sm:text-5xl font-light text-[#2a331a] leading-[1.08]">
            What you&rsquo;d <em className="italic font-medium text-[#5f7138]">actually</em> get.
          </h2>
        </Reveal>

        {/* Row 1 — map */}
        <Reveal className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center mb-20">
          <ImageBlock src={LANDING_IMAGES.shotMap} alt="VinMap interactive map" />
          <div>
            <h3 className="font-display text-2xl sm:text-3xl font-light text-[#2a331a] mb-3">
              The whole country, <em className="italic text-[#5f7138]">one map</em>.
            </h3>
            <p className="text-[15px] text-[#4a5230]/85 leading-relaxed">
              Forest cover, loss rates and cover-change trends for all 63 provinces, 2000–2024 — with live fire
              hotspots and news geo-tagged on top. Scrub the timeline and watch two decades unfold.
            </p>
          </div>
        </Reveal>

        {/* Row 2 — verdict band (live element, reversed) */}
        <Reveal className="grid md:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="md:order-2 flex justify-center md:justify-start">
            <VerdictBand />
          </div>
          <div className="md:order-1">
            <h3 className="font-display text-2xl sm:text-3xl font-light text-[#2a331a] mb-3">
              A verdict, <em className="italic text-[#5f7138]">not a wall of numbers</em>.
            </h3>
            <p className="text-[15px] text-[#4a5230]/85 leading-relaxed">
              VinMap reads the risk for your provinces and tells you, in one glance, which areas need attention —
              named, ranked and refreshed live. (That band on the left is the real thing.)
            </p>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
