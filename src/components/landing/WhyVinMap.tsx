'use client';

import { BarChart3, ShieldCheck, Flame, Building2, type LucideIcon } from 'lucide-react';
import Reveal from './Reveal';
import { LANDING_IMAGES } from './assets';

const CARDS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BarChart3,
    title: 'Land & forest intelligence',
    body: 'Two decades of forest cover and loss for 63 provinces, on one interactive map.',
  },
  {
    icon: ShieldCheck,
    title: 'EUDR plot checker',
    body: 'Check any parcel against post-2020 forest-loss alerts ahead of the Dec 2026 deadline.',
  },
  {
    icon: Flame,
    title: 'Live forecast & fire',
    body: 'Auto-updating risk verdicts with live NASA FIRMS fire activity and a 2030 projection.',
  },
  {
    icon: Building2,
    title: 'Role-based insights',
    body: 'Scoring tailored for financiers, NGOs, manufacturers, traders and exporters.',
  },
];

export default function WhyVinMap() {
  return (
    <section id="why" className="relative py-20 sm:py-28 scroll-mt-16 overflow-hidden">
      {/* subtle forest backdrop behind the olive cards */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LANDING_IMAGES.forestWhy} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-[#eef1e3]/55" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-12">
          <p className="text-[11px] font-bold text-[#5f7138] uppercase tracking-[0.18em] mb-3">Why VinMap</p>
          <h2 className="font-display text-3xl sm:text-5xl font-light text-[#2a331a] leading-[1.08]">
            Every angle on the land, <em className="italic font-medium text-[#5f7138]">in one place</em>.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <div className="olive-card h-full p-6 hover:-translate-y-1 transition-transform duration-300">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-[#f4f0e6]" />
                </div>
                <h3 className="font-display text-lg font-medium text-[#f4f0e6] mb-2">{c.title}</h3>
                <p className="text-[13px] text-[#f4f0e6]/80 leading-relaxed">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
