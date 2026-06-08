import { CheckCircle2, X, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { PLAN_META, AI_ADDON, AI_ADDON_FEATURES } from '@/lib/subscription';

export const metadata = { title: 'Pricing — VinMap Biz' };

// Comparison matrix. Value order per row: [Explorer, Individual, Org, Enterprise].
type Val = boolean | string;
const GROUPS: { group: string; rows: { label: string; vals: [Val, Val, Val, Val] }[] }[] = [
  {
    group: 'Platform',
    rows: [
      { label: 'Map + province stats', vals: [true, true, true, true] },
      { label: 'Forest-loss heatmap', vals: [true, true, true, true] },
      { label: 'News feed', vals: ['5', 'Full', 'Full', 'Full'] },
    ],
  },
  {
    group: 'Land analysis',
    rows: [
      { label: 'Parcel assessment', vals: [false, '3 / mo', 'Unlimited', 'Unlimited'] },
      { label: 'Weather + soil real data', vals: [false, true, true, true] },
      { label: 'Crop viability', vals: [false, true, true, true] },
      { label: 'Saved assessments', vals: [false, '5', '50', 'Unlimited'] },
    ],
  },
  {
    group: 'Compliance & reports',
    rows: [
      { label: 'EUDR compliance check', vals: [false, 'Manual', true, 'Custom'] },
      { label: 'Export PDF report', vals: [false, '3 / mo', 'Unlimited', 'Branded'] },
      { label: 'Investment score + radar', vals: [false, false, true, 'Custom'] },
    ],
  },
  {
    group: 'Support & integration',
    rows: [
      { label: 'API access', vals: [false, false, 'Add-on', 'Unlimited'] },
      { label: 'Priority support', vals: [false, false, true, 'Dedicated'] },
      { label: 'Custom dashboard + local hosting', vals: [false, false, false, true] },
      { label: 'Multi-supplier tracking', vals: [false, false, false, true] },
    ],
  },
  {
    group: '✦ AI Add-on (optional — attaches to any paid tier)',
    rows: [
      { label: 'AI parcel flagging', vals: [false, 'Add-on', 'Add-on', true] },
      { label: 'Natural-language queries on forest data', vals: [false, 'Add-on', 'Add-on', true] },
      { label: 'Auto EUDR batch reports', vals: [false, false, 'Add-on', true] },
      { label: 'Batch parcel scanning', vals: [false, false, 'Add-on', true] },
      { label: 'API access (500 / day)', vals: [false, false, 'Add-on', 'Unlimited'] },
      { label: 'Investment Scorecard', vals: [false, false, 'Add-on', true] },
    ],
  },
];

function Cell({ val }: { val: Val }) {
  if (val === false) return <X className="w-4 h-4 text-[#d1d5db] mx-auto" />;
  if (val === true) return <CheckCircle2 className="w-4 h-4 text-[#3B6D11] mx-auto" />;
  if (val === 'Add-on')
    return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAEEDA] text-[#854F0B]">Add-on</span>;
  return <span className="text-[11px] font-medium text-[#374151]">{val}</span>;
}

const TIERS = ['free', 'analyst', 'professional', 'enterprise'] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/app" className="inline-block mb-6 text-[11px] text-[#6b7280] hover:text-[#374151] transition-colors">
            ← Back to map
          </Link>
          <h1 className="text-3xl font-bold text-[#111827] mb-3">Simple, transparent pricing</h1>
          <p className="text-sm text-[#6b7280] max-w-md mx-auto">
            Start free. Upgrade for parcel assessment and EUDR compliance — and add the AI suite to any paid tier.
          </p>
          <p className="text-[11px] text-[#9ca3af] mt-2">Prices in VND, billed annually.</p>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {TIERS.map((tier) => {
            const meta = PLAN_META[tier];
            const isPopular = tier === 'analyst';
            const onboarding = 'onboardingLabel' in meta ? meta.onboardingLabel : undefined;
            return (
              <div
                key={tier}
                className={`relative rounded-2xl border p-6 bg-white/60 backdrop-blur-sm shadow-sm flex flex-col ${
                  isPopular ? 'border-[#185FA5]/40 shadow-[0_4px_24px_rgba(24,95,165,0.12)]' : 'border-[#35b779]/[0.15]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#185FA5] text-white shadow-sm">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${meta.badge}`}>
                    {meta.icon} {meta.name.toUpperCase()}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[#111827]">{meta.priceLabel}</span>
                    {meta.unit && <span className="text-[11px] text-[#6b7280]">{meta.unit}</span>}
                  </div>
                  {onboarding && <p className="text-[11px] text-[#A32D2D] mt-1">{onboarding}</p>}
                  <p className="text-[11px] text-[#6b7280] mt-2">{meta.description}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {meta.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3B6D11] mt-0.5 shrink-0" />
                      <span className="text-[11px] text-[#374151]">{h}</span>
                    </li>
                  ))}
                </ul>

                {tier === 'free' ? (
                  <Link
                    href="/app"
                    className="block w-full py-2.5 rounded-xl text-sm font-medium text-center border border-[#35b779]/20 text-[#374151] hover:bg-[#35b779]/[0.06] transition-all"
                  >
                    Start free
                  </Link>
                ) : tier === 'enterprise' ? (
                  <a
                    href="mailto:hello@vinmapbiz.com?subject=Enterprise / Gov inquiry"
                    className="block w-full py-2.5 rounded-xl text-sm font-medium text-center bg-[#534AB7] text-white hover:bg-[#453d9e] transition-all"
                  >
                    Contact sales
                  </a>
                ) : (
                  <button
                    type="button"
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isPopular ? 'bg-[#185FA5] text-white hover:bg-[#13507f]' : 'bg-[#111827] text-white hover:bg-[#1f2937]'
                    }`}
                  >
                    Choose {meta.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* AI Add-on callout */}
        <div className="rounded-2xl border border-[#854F0B]/25 bg-[#FAEEDA]/40 p-6 mb-14">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#854F0B]/[0.12] border border-[#854F0B]/25 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#854F0B]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111827]">✦ AI Add-on</p>
                <p className="text-[11px] text-[#6b7280]">Optional — attach Midori&rsquo;s AI suite to any paid tier.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-[#185FA5]/20 text-[#185FA5] font-medium">
                Individual {AI_ADDON.analyst.label} {AI_ADDON.analyst.unit}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-[#854F0B]/20 text-[#854F0B] font-medium">
                Org {AI_ADDON.professional.label} {AI_ADDON.professional.unit}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/70 border border-[#534AB7]/20 text-[#534AB7] font-medium">
                Enterprise — {AI_ADDON.enterprise.label}
              </span>
            </div>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
            {AI_ADDON_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[11px] text-[#374151]">
                <Sparkles className="w-3 h-3 text-[#854F0B] mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Comparison matrix */}
        <div className="rounded-2xl border border-[#35b779]/[0.15] bg-white/60 backdrop-blur-sm overflow-x-auto mb-8">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-5 px-4 py-3 border-b border-[#35b779]/[0.12] bg-[#35b779]/[0.03]">
              <div className="text-xs font-bold text-[#374151]">Feature</div>
              {TIERS.map((t) => (
                <div key={t} className="text-xs font-bold text-[#374151] text-center">{PLAN_META[t].name}</div>
              ))}
            </div>
            {GROUPS.map((g) => (
              <div key={g.group}>
                <div className="px-4 py-2 bg-[#35b779]/[0.05] text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                  {g.group}
                </div>
                {g.rows.map((row, i) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-5 px-4 py-2.5 items-center ${i % 2 !== 0 ? 'bg-[#35b779]/[0.02]' : ''}`}
                  >
                    <span className="text-[11px] text-[#374151]">{row.label}</span>
                    {row.vals.map((v, j) => (
                      <div key={j} className="text-center"><Cell val={v} /></div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#9ca3af]">
          Questions about onboarding or volume pricing?{' '}
          <a href="mailto:hello@vinmapbiz.com" className="text-[#35b779] hover:underline">Email us</a>
        </p>
      </div>
    </main>
  );
}
