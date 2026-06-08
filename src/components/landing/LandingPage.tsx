'use client';

import LandingNav from './LandingNav';
import Hero from './Hero';
import Marquee from './Marquee';
import ProductShowcase from './ProductShowcase';
import WhyVinMap from './WhyVinMap';
import HowItWorks from './HowItWorks';
import MidoriSpotlight from './MidoriSpotlight';
import PricingTeaser from './PricingTeaser';
import FinalCTA from './FinalCTA';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-[#2a331a] selection:bg-[#5f7138]/20 overflow-x-hidden">
      <LandingNav />
      <main>
        <Hero />
        <Marquee />
        <ProductShowcase />
        <WhyVinMap />
        <HowItWorks />
        <MidoriSpotlight />
        <PricingTeaser />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
