'use client';

import { Database, AlertTriangle, CheckCircle2 } from 'lucide-react';

type BadgeVariant = 'live' | 'modeled' | 'fallback';

interface Props {
  source: string;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_META: Record<BadgeVariant, {
  icon: React.FC<{ className?: string }>;
  bg: string;
  text: string;
  border: string;
}> = {
  live: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/[0.08]',
    text: 'text-emerald-600',
    border: 'border-emerald-500/20',
  },
  modeled: {
    icon: Database,
    bg: 'bg-[#35b779]/[0.07]',
    text: 'text-[#374151]',
    border: 'border-[#35b779]/[0.18]',
  },
  fallback: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/[0.07]',
    text: 'text-yellow-600',
    border: 'border-yellow-500/20',
  },
};

/**
 * Small inline badge showing where a data point originates.
 * Use variant="live" for real API data, "modeled" for synthetic/estimated,
 * "fallback" when a live source was attempted but unavailable.
 */
export default function DataSourceBadge({ source, variant = 'modeled', className = '' }: Props) {
  const meta = VARIANT_META[variant];
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${meta.bg} ${meta.text} ${meta.border} ${className}`}
      title={`Data source: ${source}`}
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      {source}
    </span>
  );
}

export function DataDisclaimer() {
  return (
    <div className="px-3 py-2 bg-[#35b779]/[0.04] border-t border-[#35b779]/[0.15]">
      <p className="text-[11px] text-[#6b7280] leading-relaxed">
        Data sources: Hansen/UMD/Google/USGS/NASA via Global Forest Watch, World Bank Open Data (AG.LND.FRST.K2),
        NASA FIRMS. Province-level statistics are modeled estimates pending live API integration.
        Not for regulatory compliance — cross-reference with MARD official data.
      </p>
    </div>
  );
}
