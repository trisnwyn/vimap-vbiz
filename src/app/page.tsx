import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'VinMap — Vietnam Land Use & Cover Intelligence',
  description:
    'See Vietnam’s land clearly. Track forest cover, deforestation, fire activity and EUDR risk across 63 provinces (2000–2024) — read by Midori, your AI sustainability analyst.',
  alternates: { canonical: '/' },
};

export default function Page() {
  return <LandingPage />;
}
