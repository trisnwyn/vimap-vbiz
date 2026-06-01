'use client';

import { useMemo, useState } from 'react';
import { Search, Check, Building2, Sparkles } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { DEFAULT_PROFILE } from '@/hooks/useBusinessProfile';
import type {
  BusinessProfile,
  BusinessRole,
  Commodity,
  Market,
  Concern,
  Language,
} from '@/types/intel';

interface BusinessProfileFormProps {
  /** Existing profile to edit; falls back to a sensible default. */
  initial?: BusinessProfile | null;
  onSave: (profile: BusinessProfile) => void;
  onCancel?: () => void;
  /** Heading copy changes for first-run vs. editing. */
  mode?: 'onboard' | 'edit';
}

// ── Option metadata ───────────────────────────────────────────────────────
const ROLE_OPTIONS: { value: BusinessRole; label: string }[] = [
  { value: 'exporter', label: 'Exporter' },
  { value: 'importer', label: 'Importer' },
  { value: 'roaster', label: 'Roaster / Processor' },
  { value: 'trader', label: 'Trader' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'financier', label: 'Financier / Investor' },
  { value: 'ngo', label: 'NGO / Research' },
  { value: 'other', label: 'Other' },
];

const COMMODITY_OPTIONS: { value: Commodity; label: string }[] = [
  { value: 'coffee', label: 'Coffee' },
  { value: 'rubber', label: 'Rubber' },
  { value: 'timber', label: 'Timber' },
  { value: 'rice', label: 'Rice' },
  { value: 'tea', label: 'Tea' },
  { value: 'maize', label: 'Maize' },
  { value: 'lychee', label: 'Lychee' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'dragon fruit', label: 'Dragon fruit' },
  { value: 'coconut', label: 'Coconut' },
  { value: 'shrimp', label: 'Shrimp' },
];

const MARKET_OPTIONS: { value: Market; label: string }[] = [
  { value: 'eu', label: 'European Union' },
  { value: 'us', label: 'United States' },
  { value: 'china', label: 'China' },
  { value: 'japan', label: 'Japan' },
  { value: 'domestic', label: 'Domestic (Vietnam)' },
  { value: 'other', label: 'Other' },
];

const CONCERN_OPTIONS: { value: Concern; label: string }[] = [
  { value: 'eudr', label: 'EUDR compliance' },
  { value: 'price', label: 'Price volatility' },
  { value: 'climate', label: 'Climate / weather' },
  { value: 'supply', label: 'Supply disruption' },
  { value: 'reputation', label: 'Reputation / ESG' },
  { value: 'certification', label: 'Certification' },
];

// Generic multi-select toggle helper.
function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// ── Reusable chip ─────────────────────────────────────────────────────────
function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 px-3 min-h-[36px] rounded-full text-xs font-medium transition-all glass-pill ${
        active ? 'active text-accent' : 'text-[#374151] hover:text-[#111827]'
      }`}
    >
      {active && <Check className="w-3 h-3" aria-hidden="true" />}
      {label}
    </button>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-semibold text-[#1f2937] uppercase tracking-wider">
        {children}
      </span>
      {hint && <span className="ml-2 text-[11px] text-[#6b7280] normal-case">{hint}</span>}
    </div>
  );
}

export default function BusinessProfileForm({
  initial,
  onSave,
  onCancel,
  mode = 'onboard',
}: BusinessProfileFormProps) {
  const base = initial ?? DEFAULT_PROFILE;

  const [companyName, setCompanyName] = useState(base.companyName ?? '');
  const [role, setRole] = useState<BusinessRole>(base.role);
  const [commodities, setCommodities] = useState<Commodity[]>(base.commodities);
  const [sourcingProvinces, setSourcingProvinces] = useState<string[]>(base.sourcingProvinces);
  const [markets, setMarkets] = useState<Market[]>(base.markets);
  const [concerns, setConcerns] = useState<Concern[]>(base.concerns);
  const [language, setLanguage] = useState<Language>(base.language);
  const [provinceQuery, setProvinceQuery] = useState('');

  // Group provinces by region for the picker; filter by search query.
  const provincesByRegion = useMemo(() => {
    const q = provinceQuery.trim().toLowerCase();
    const groups = new Map<string, { id: string; name: string }[]>();
    for (const p of provinces) {
      if (q && !p.name.toLowerCase().includes(q) && !p.nameVi.toLowerCase().includes(q)) {
        continue;
      }
      if (!groups.has(p.region)) groups.set(p.region, []);
      groups.get(p.region)!.push({ id: p.id, name: p.name });
    }
    return Array.from(groups.entries());
  }, [provinceQuery]);

  const canSave = commodities.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      companyName: companyName.trim() || undefined,
      role,
      commodities,
      sourcingProvinces,
      markets,
      concerns,
      language,
      updatedAt: Date.now(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#35b779]/[0.15] shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <h2 className="text-sm font-bold text-[#111827]">
            {mode === 'onboard' ? 'Set up your intelligence profile' : 'Edit profile'}
          </h2>
        </div>
        <p className="text-xs text-[#6b7280] leading-snug">
          VinMap Intelligence tailors every briefing, risk score, and answer to your business.
          This stays on your device.
        </p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Company name */}
        <div>
          <FieldLabel hint="optional">Company</FieldLabel>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Highlands Coffee Export Co."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#111827] glass-btn placeholder:text-[#9ca3af] focus:outline-none"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <FieldLabel>I am a…</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={role === o.value}
                onClick={() => setRole(o.value)}
              />
            ))}
          </div>
        </div>

        {/* Commodities */}
        <div>
          <FieldLabel hint="select at least one">Commodities</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {COMMODITY_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={commodities.includes(o.value)}
                onClick={() => setCommodities((c) => toggle(c, o.value))}
              />
            ))}
          </div>
        </div>

        {/* Markets */}
        <div>
          <FieldLabel hint="EU & US carry due-diligence weight">Destination markets</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {MARKET_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={markets.includes(o.value)}
                onClick={() => setMarkets((m) => toggle(m, o.value))}
              />
            ))}
          </div>
        </div>

        {/* Concerns */}
        <div>
          <FieldLabel>Top concerns</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {CONCERN_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                active={concerns.includes(o.value)}
                onClick={() => setConcerns((c) => toggle(c, o.value))}
              />
            ))}
          </div>
        </div>

        {/* Sourcing provinces */}
        <div>
          <FieldLabel hint={`${sourcingProvinces.length} selected`}>Sourcing provinces</FieldLabel>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af]" />
            <input
              type="text"
              value={provinceQuery}
              onChange={(e) => setProvinceQuery(e.target.value)}
              placeholder="Search provinces…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-[#111827] glass-btn placeholder:text-[#9ca3af] focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-[#35b779]/[0.15] bg-[#faf8f3]/60 p-2 space-y-2">
            {provincesByRegion.length === 0 && (
              <p className="text-xs text-[#6b7280] px-1 py-2">No provinces match “{provinceQuery}”.</p>
            )}
            {provincesByRegion.map(([region, list]) => (
              <div key={region}>
                <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1 px-1">
                  {region}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((p) => (
                    <Chip
                      key={p.id}
                      label={p.name}
                      active={sourcingProvinces.includes(p.id)}
                      onClick={() => setSourcingProvinces((s) => toggle(s, p.id))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <FieldLabel>Briefing language</FieldLabel>
          <div
            role="group"
            aria-label="Briefing language"
            className="inline-flex items-center glass-btn rounded-lg p-0.5"
          >
            {(['en', 'vi'] as Language[]).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLanguage(lng)}
                aria-pressed={language === lng}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  language === lng ? 'bg-accent/15 text-accent' : 'text-[#374151] hover:text-[#111827]'
                }`}
              >
                {lng === 'en' ? 'English' : 'Tiếng Việt'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-[#35b779]/[0.15] shrink-0 flex items-center justify-between gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 min-h-[40px] rounded-lg text-xs font-medium text-[#374151] hover:text-[#111827] glass-btn transition-all"
          >
            Cancel
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={!canSave}
          className="flex items-center gap-1.5 px-5 min-h-[40px] rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: canSave
              ? 'linear-gradient(135deg, rgba(53,183,121,0.95) 0%, rgba(34,85,63,0.97) 100%)'
              : 'rgba(53,183,121,0.4)',
            color: '#fff',
            boxShadow: canSave ? '0 2px 12px rgba(53,183,121,0.30)' : 'none',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {mode === 'onboard' ? 'Generate my briefing' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
