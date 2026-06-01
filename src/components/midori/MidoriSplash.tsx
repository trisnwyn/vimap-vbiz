'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const SESSION_KEY = 'midori.splash.seen';

export default function MidoriSplash() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Decide once on the client whether to show the splash this session.
  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      /* sessionStorage unavailable — skip splash */
    }
    if (!seen) {
      setMounted(true);
      // Next frame so the fade-in transition runs from opacity-0.
      requestAnimationFrame(() => setVisible(true));
    }
  }, []);

  // Auto-dismiss timer.
  useEffect(() => {
    if (!mounted) return;
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, [mounted]);

  const dismiss = () => setVisible(false);

  const handleTransitionEnd = () => {
    if (!visible) {
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      setMounted(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      onClick={dismiss}
      onTransitionEnd={handleTransitionEnd}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a1a0f]/90 backdrop-blur-sm transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Gem with glowing ring */}
      <span className="relative inline-flex w-32 h-32">
        <span className="absolute -inset-3 rounded-full ring-2 ring-[#35b779]/40 animate-ping" />
        <span className="absolute -inset-1 rounded-full ring-2 ring-[#35b779]/60 shadow-[0_0_40px_rgba(53,183,121,0.6)]" />
        <Image
          src="/midori-gem.jpg"
          alt="Midori"
          width={128}
          height={128}
          priority
          className="relative w-32 h-32 rounded-full object-cover"
        />
      </span>

      {/* Wordmark */}
      <h1 className="mt-6 text-3xl font-bold text-white animate-fade-in" style={{ animationDelay: '200ms' }}>
        Midori
      </h1>
      <p className="mt-1.5 text-sm text-[#9ca3af] animate-fade-in" style={{ animationDelay: '200ms' }}>
        VinMap Intelligence
      </p>
    </div>
  );
}
