import Link from 'next/link';
import { TreePine } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="bg-[#2a331a] text-[#dfe4cf]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#84a83f]/25 flex items-center justify-center">
                <TreePine className="w-5 h-5 text-[#a8c46a]" />
              </div>
              <span className="font-display text-xl font-semibold tracking-tight text-[#f4f0e6]">VinMap</span>
            </div>
            <p className="text-[13px] text-[#dfe4cf]/70 leading-relaxed">
              Vietnam land-use &amp; cover intelligence across 63 provinces, 2000–2024.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-7 gap-y-2 text-[13px]">
            <Link href="/app" className="text-[#dfe4cf]/85 hover:text-[#f4f0e6] transition-colors">Launch app</Link>
            <Link href="#why" className="text-[#dfe4cf]/85 hover:text-[#f4f0e6] transition-colors">Why VinMap</Link>
            <Link href="#how" className="text-[#dfe4cf]/85 hover:text-[#f4f0e6] transition-colors">How it works</Link>
            <Link href="/pricing" className="text-[#dfe4cf]/85 hover:text-[#f4f0e6] transition-colors">Pricing</Link>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-[#dfe4cf]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-[#dfe4cf]/55 leading-relaxed max-w-2xl">
            Data: Hansen/UMD/Google/USGS via Global Forest Watch · World Bank Open Data (AG.LND.FRST.K2) · NASA FIRMS.
            Indicative only — not for regulatory compliance; cross-reference with MARD official data.
          </p>
          <p className="text-[11px] text-[#dfe4cf]/55 shrink-0">© 2026 VinMap</p>
        </div>
      </div>
    </footer>
  );
}
