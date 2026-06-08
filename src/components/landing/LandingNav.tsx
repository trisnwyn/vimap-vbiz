'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TreePine, ArrowRight } from 'lucide-react';

const LINKS = [
  { href: '#why', label: 'Why VinMap' },
  { href: '#how', label: 'How it works' },
  { href: '/pricing', label: 'Pricing' },
];

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-[#faf8f3]/80 backdrop-blur-xl border-b border-[#5f7138]/12 shadow-[0_1px_20px_rgba(74,90,43,0.05)]'
          : 'border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#5f7138]/15 flex items-center justify-center group-hover:bg-[#5f7138]/25 transition-colors">
            <TreePine className="w-5 h-5 text-[#5f7138]" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-[#2a331a]">VinMap</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="link-underline text-[13px] font-medium text-[#4a5230] hover:text-[#2a331a] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold text-[#f4f0e6] bg-[#5f7138] hover:bg-[#4a5a2b] transition-colors"
        >
          Launch app
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
