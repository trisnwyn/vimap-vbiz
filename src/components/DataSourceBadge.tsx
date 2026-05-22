'use client';

interface DataSourceBadgeProps {
  source?: 'gfw_hansen' | 'world_bank' | 'nasa_firms' | 'modeled' | string;
  className?: string;
}

const sourceLabels: Record<string, { label: string; color: string; dotColor: string }> = {
  gfw_hansen: { label: 'Hansen/GFW', color: 'text-green-400', dotColor: 'bg-green-400' },
  world_bank: { label: 'World Bank', color: 'text-blue-400', dotColor: 'bg-blue-400' },
  nasa_firms: { label: 'NASA FIRMS', color: 'text-orange-400', dotColor: 'bg-orange-400' },
  modeled: { label: 'Modeled', color: 'text-gray-400', dotColor: 'bg-gray-500' },
};

export default function DataSourceBadge({ source = 'modeled', className = '' }: DataSourceBadgeProps) {
  const config = sourceLabels[source] ?? sourceLabels.modeled;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${config.color} ${className}`}>
      <span className={`w-1 h-1 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
}

export function DataDisclaimer() {
  return (
    <div className="px-3 py-2 bg-white/[0.02] border-t border-white/[0.06]">
      <p className="text-[11px] text-gray-500 leading-relaxed">
        Data sources: Hansen/UMD/Google/USGS/NASA via Global Forest Watch, World Bank Open Data (AG.LND.FRST.K2),
        NASA FIRMS. Province-level statistics are modeled estimates pending live API integration.
        Not for regulatory compliance — cross-reference with MARD official data.
      </p>
    </div>
  );
}
