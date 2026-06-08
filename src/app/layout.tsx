import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Elegant high-contrast serif for landing-page display type.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: "VinMap — Vietnam Land Use & Cover Intelligence",
  description:
    "Interactive geospatial dashboard tracking Vietnam's forest cover, deforestation, and EUDR compliance across 63 provinces from 2000 to 2024.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "VinMap — Vietnam Land Use & Cover Intelligence",
    description:
      "Track deforestation, assess EUDR compliance, and explore AI-powered risk analysis across Vietnam's 63 provinces.",
    type: "website",
    locale: "en_US",
    siteName: "VinMap",
  },
  twitter: {
    card: "summary_large_image",
    title: "VinMap — Vietnam Land Use & Cover Intelligence",
    description:
      "Interactive geospatial dashboard for Vietnam's forest cover and EUDR compliance.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
