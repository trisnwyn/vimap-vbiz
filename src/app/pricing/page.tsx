import { CheckCircle2, X, Building2 } from 'lucide-react';
import Link from 'next/link';
import { PLAN_META } from '@/lib/subscription';

export const metadata = { title: 'Pricing — VinMap Biz' };

const COMPARISON: { label: string; free: boolean | string; analyst: boolean | string; pro: boolean | string }[] = [
  { label: 'Province map & charts',  free: true,    analyst: true,        pro: true        },
  { label: 'Forest loss heatmap',    free: true,    analyst: true,        pro: true        },
  { label: 'Time slider 2000–2024',  free: true,    analyst: true,        pro: true        },
  { label: 'News feed',              free: '5',     analyst: 'All',       pro: 'All'       },
  { label: 'Parcel assessment',      free: false,   analyst: true,        pro: true        },
  { label: 'Real weather + soil',    free: false,   analyst: true,        pro: true        },
  { label: 'EUDR compliance',        free: false,   analyst: true,        pro: true        },
  { label: 'Investment score',       free: false,   analyst: true,        pro: true        },
  { label: 'PDF export',             free: false,   analyst: true,        pro: true        },
  { label: 'AI analysis',            free: false,   analyst: '20/mo',     pro: 'Unlimited' },
  { label: 'Saved assessments',      free: false,   analyst: '10',        pro: 'Unlimited' },
  { label: 'API access',             free: false,   analyst: false,       pro: '500/day'   },
  { label: 'Priority support',       free: false,   analyst: false,       pro: true        },
];

function Cell({ val }: { val: boolean | string }) {
  if (val === false) return <X className="w-4 h-4 text-[#d1d5db] mx-auto" />;
  if (val === true)  return <CheckCircle2 className="w-4 h-4 text-[#35b779] mx-auto" />;
  return <span className="text-[11px] font-medium text-[#374151]">{val as string}</span>;
}

export default function PricingPage() {
  const tiers = ['free', 'analyst', 'professional'] as const;

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 py-16">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-block mb-6 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors">
            ← Back to map
          </Link>
          <h1 className="text-3xl font-bold text-[#111827] mb-3">Simple, transparent pricing</h1>
          <p className="text-sm text-[#6b7280] max-w-md mx-auto">
            Start free. Upgrade when you need parcel assessment, EUDR compliance, or AI analysis.
          </p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {tiers.map((tier) => {
            const meta = PLAN_META[tier];
            const isPopular = tier === 'analyst';
            return (
              <div
                key={tier}
                className={`relative rounded-2xl border p-6 bg-white/60 backdrop-blur-sm shadow-sm ${
                  isPopular
                    ? 'border-[#35b779]/40 shadow-[0_4px_24px_rgba(53,183,121,0.12)]'
                    : 'border-[#35b779]/[0.15]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#35b779] text-white shadow-sm">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${meta.badge}`}>
                    {meta.name.toUpperCase()}
                  </span>
                  <div className="flex items-baseline gap-1">
                    {meta.price.monthly === 0 ? (
                      <span className="text-2xl font-bold text-[#111827]">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-[#111827]">${meta.price.monthly}</span>
                        <span className="text-sm text-[#6b7280]">/month</span>
                      </>
                    )}
                  </div>
                  {meta.price.yearly > 0 && (
                    <p className="text-[11px] text-[#6b7280] mt-0.5">
                      or ${meta.price.yearly}/year{' '}
                      <span className="text-[#35b779] font-medium">(save 17%)</span>
                    </p>
                  )}
                  <p className="text-[11px] text-[#6b7280] mt-2">{meta.description}</p>
                </div>

                <ul className="space-y-2 mb-6">
                  {meta.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#35b779] mt-0.5 shrink-0" />
                      <span className="text-[11px] text-[#374151]">{h}</span>
                    </li>
                  ))}
                </ul>

                {tier === 'free' ? (
                  <Link
                    href="/"
                    className="block w-full py-2.5 rounded-xl text-sm font-medium text-center border border-[#35b779]/20 text-[#374151] hover:bg-[#35b779]/[0.06] transition-all"
                  >
                    Start free
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isPopular
                        ? 'bg-[#35b779] text-white hover:bg-[#2a9d6b] shadow-sm'
                        : 'bg-[#111827] text-white hover:bg-[#1f2937]'
                    }`}
                  >
                    Get {meta.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Enterprise row */}
        <div className="rounded-2xl border border-[#35b779]/[0.15] bg-white/60 backdrop-blur-sm p-6 mb-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/[0.08] border border-purple-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#111827]">Enterprise</p>
              <p className="text-[11px] text-[#6b7280]">Team seats · white-label · unlimited API · custom data feeds · SLA</p>
            </div>
          </div>
          <a
            href="mailto:hello@vinmapbiz.com?subject=Enterprise inquiry"
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-medium border border-purple-500/25 text-purple-600 hover:bg-purple-500/[0.06] transition-all"
          >
            Contact us
          </a>
        </div>

        {/* Comparison table */}
        <div className="rounded-2xl border border-[#35b779]/[0.15] bg-white/60 backdrop-blur-sm overflow-hidden mb-8">
          <div className="grid grid-cols-4 px-4 py-3 border-b border-[#35b779]/[0.12] bg-[#35b779]/[0.03]">
            <div className="text-xs font-bold text-[#374151]">Feature</div>
            {(['Explorer', 'Analyst', 'Professional'] as const).map((n) => (
              <div key={n} className="text-xs font-bold text-[#374151] text-center">{n}</div>
            ))}
          </div>
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 px-4 py-2.5 items-center ${i % 2 !== 0 ? 'bg-[#35b779]/[0.02]' : ''}`}
            >
              <span className="text-[11px] text-[#374151]">{row.label}</span>
              <div className="text-center"><Cell val={row.free} /></div>
              <div className="text-center"><Cell val={row.analyst} /></div>
              <div className="text-center"><Cell val={row.pro} /></div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#9ca3af]">
          All plans include a 14-day free trial on paid tiers.{' '}
          Questions?{' '}
          <a href="mailto:hello@vinmapbiz.com" className="text-[#35b779] hover:underline">Email us</a>
        </p>
      </div>
    </main>
  );
}
