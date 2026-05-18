'use client';

import { useState, useEffect } from 'react';
import { TreePine, Shield, Newspaper, BarChart3, ChevronRight, X } from 'lucide-react';

interface IntroOverlayProps {
  onDismiss: () => void;
}

const HEADLINE_STATS = [
  { value: '14.8M', label: 'hectares of forest', sub: 'monitored across 63 provinces' },
  { value: '€2.3B', label: 'at-risk EU trade', sub: 'coffee · rubber · timber' },
  { value: 'Dec 2026', label: 'EUDR enforcement', sub: 'plot-level proof required' },
  { value: '7', label: 'high-risk provinces', sub: 'loss rate > 1.5% annually' },
];

const FEATURES = [
  { icon: BarChart3, color: 'text-green-400', title: 'Land Cover Intelligence', desc: 'Track forest loss across 63 provinces from 2001 to 2024 at provincial resolution.' },
  { icon: Newspaper, color: 'text-blue-400', title: 'News Intel Layer', desc: '25 curated articles geo-tagged to affected regions — click any marker to read.' },
  { icon: Shield, color: 'text-red-400', title: 'EUDR Plot Checker', desc: 'Draw any polygon on the map and get an instant deforestation compliance assessment.' },
];

export default function IntroOverlay({ onDismiss }: IntroOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [statIdx, setStatIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStatIdx((i) => (i + 1) % HEADLINE_STATS.length), 2500);
    return () => clearInterval(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ background: 'rgba(4, 8, 12, 0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full max-w-2xl mx-4 animate-fade-in">
        <button
          onClick={handleDismiss}
          className="absolute -top-10 right-0 text-gray-500 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-accent/20 border border-accent/20 flex items-center justify-center">
              <TreePine className="w-7 h-7 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Vi<span className="text-accent">Map</span>
          </h1>
          <p className="text-gray-400 text-sm">Vietnam Land Use & Cover Intelligence Platform</p>
        </div>

        {/* Rotating stat */}
        <div className="glass-panel rounded-2xl p-5 mb-4 text-center min-h-[90px] flex flex-col items-center justify-center">
          <div className="text-4xl font-bold font-mono text-accent mb-1 transition-all">
            {HEADLINE_STATS[statIdx].value}
          </div>
          <div className="text-white font-medium text-sm">{HEADLINE_STATS[statIdx].label}</div>
          <div className="text-gray-500 text-xs mt-0.5">{HEADLINE_STATS[statIdx].sub}</div>
        </div>

        {/* Context */}
        <div className="glass-panel rounded-2xl p-4 mb-4">
          <p className="text-gray-300 text-sm leading-relaxed text-center">
            On <span className="text-white font-semibold">30 December 2026</span>, the EU Deforestation
            Regulation becomes enforceable. Vietnam's{' '}
            <span className="text-accent font-semibold">600,000 smallholder coffee farms</span> must
            prove their land was not deforested after 2020. There is no open national baseline.{' '}
            <span className="text-white font-semibold">VinMap is that baseline.</span>
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} className="glass-panel rounded-xl p-3 text-center">
              <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
              <div className="text-white text-xs font-semibold mb-1">{title}</div>
              <div className="text-gray-500 text-[10px] leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent text-black font-bold text-sm hover:bg-accent/90 transition-all active:scale-[0.99]"
        >
          Explore the Platform
          <ChevronRight className="w-4 h-4" />
        </button>

        <p className="text-center text-[10px] text-gray-600 mt-3">
          Data covers 2001–2024 · 63 provinces · Methodology: Hansen GFC + MARD forestry reports
        </p>
      </div>
    </div>
  );
}
