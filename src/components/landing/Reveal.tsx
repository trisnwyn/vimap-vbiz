'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms. */
  delay?: number;
  className?: string;
}

/**
 * Scroll-reveal wrapper — progressive enhancement.
 *
 * Content is visible by default (plain `.reveal`). Only after this client
 * component mounts AND motion is allowed do we "arm" it (`.reveal-armed`,
 * which hides it), then reveal it (`.is-visible`) when it scrolls into view.
 * If JS never runs / hydration fails / IO is unsupported, the content simply
 * stays visible — it can never get stuck invisible. A safety timeout also
 * forces it visible if the observer somehow never fires.
 */
export default function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [armed, setArmed] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      return; // leave content plainly visible
    }

    // Arm (hide) now that we know JS is running and will reveal on scroll.
    setArmed(true);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    obs.observe(el);

    // Safety net: if the observer never fires for any reason, reveal anyway.
    const fallback = setTimeout(() => setInView(true), 2500);

    return () => {
      obs.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  const cls = ['reveal', armed ? 'reveal-armed' : '', inView ? 'is-visible' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={cls} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
