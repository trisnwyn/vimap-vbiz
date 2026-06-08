// ─────────────────────────────────────────────────────────────────────────
// Landing-page image slots.
//
// Every visual on the landing page points here. To use your own image:
//   1. Drop the file into  public/landing/   (e.g. hero-map.jpg)
//   2. Change the path below to match (e.g. '/landing/hero-map.jpg')
// Until then, labeled placeholder SVGs render at the documented dimensions
// so nothing breaks and the layout holds.
// ─────────────────────────────────────────────────────────────────────────

export const LANDING_IMAGES = {
  /** Hero visual — real screenshot of the vbiz map. ~1600×1000. */
  heroMap: '/landing/shot-map.png',
  /** Product showcase: the interactive map view (real screenshot). */
  shotMap: '/landing/shot-map.png',
  /** Product showcase: a land-assessment panel. ~1040×860. */
  shotAssessment: '/landing/shot-assessment.svg',
  /** Midori spotlight: a Midori briefing/answer. ~1040×860. */
  shotMidori: '/landing/shot-midori.svg',

  // ── Forest atmosphere backdrops (user-provided) ──
  /** Hero backdrop — misty forest behind the headline (cream scrim on top). */
  forestHero: '/landing/forest-hero.jpg',
  /** Final-CTA band backdrop. */
  forestCta: '/landing/forest-cta.jpg',
  /** Subtle backdrop behind the olive "Why VinMap" cards. */
  forestWhy: '/landing/forest-why.jpg',
} as const;

export type LandingImageKey = keyof typeof LANDING_IMAGES;
