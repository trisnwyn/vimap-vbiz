'use client';

import { UserCog, Radar, FileCheck2, type LucideIcon } from 'lucide-react';
import Reveal from './Reveal';

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: UserCog,
    title: 'Set your profile',
    body: 'Tell VinMap your role, commodities, sourcing provinces and markets. It shapes everything Midori analyses.',
  },
  {
    icon: Radar,
    title: 'Midori scans live data',
    body: 'She cross-references forest loss, fire hotspots, World Bank figures and live news — scoped to your provinces.',
  },
  {
    icon: FileCheck2,
    title: 'Get your briefing',
    body: 'A cited, decision-grade briefing plus an always-live forecast verdict — so you know what changed, and what to do.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-20 sm:py-28 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Reveal className="max-w-2xl mb-14">
          <p className="text-[11px] font-bold text-[#5f7138] uppercase tracking-[0.18em] mb-3">How it works</p>
          <h2 className="font-display text-3xl sm:text-5xl font-light text-[#2a331a] leading-[1.08]">
            From raw geodata to a decision, in <em className="italic font-medium text-[#5f7138]">three steps</em>.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 120}>
              <div className="relative h-full rounded-3xl border border-[#5f7138]/15 bg-white/55 p-7">
                <div className="flex items-baseline justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#5f7138]/12 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-[#5f7138]" />
                  </div>
                  <span className="font-display text-5xl font-light text-[#5f7138]/25 leading-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display text-xl font-medium text-[#2a331a] mb-2">{s.title}</h3>
                <p className="text-[14px] text-[#4a5230]/85 leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
