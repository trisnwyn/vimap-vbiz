'use client';

/**
 * RoleInsightCard — renders a role-specific assessment card based on the user's
 * business profile role, or falls back to a generic "Land Potential" summary for
 * roles that are primarily agriculture-focused (exporter, importer, roaster, trader)
 * and the null/unset case (those roles already see CropViability instead of this).
 *
 * Role routing:
 *   financier  → FinancierCard  (risk grade, carbon asset, exit liquidity)
 *   ngo        → NgoCard        (conservation score, sequestration, reforestation)
 *   manufacturer → ManufacturerCard (port/logistics, labour, site conditions)
 *   other      → GenericRoleCard  (compact land-potential summary)
 */

import type { LandAssessment } from '@/types/assessment';
import type { BusinessProfile } from '@/types/intel';
import FinancierCard from './FinancierCard';
import NgoCard from './NgoCard';
import ManufacturerCard from './ManufacturerCard';
import { Layers } from 'lucide-react';

interface Props {
  assessment: LandAssessment;
  profile: BusinessProfile;
}

export default function RoleInsightCard({ assessment, profile }: Props) {
  switch (profile.role) {
    case 'financier':
      return <FinancierCard assessment={assessment} />;
    case 'ngo':
      return <NgoCard assessment={assessment} />;
    case 'manufacturer':
      return <ManufacturerCard assessment={assessment} />;
    default:
      return <GenericRoleCard assessment={assessment} />;
  }
}

/** Compact fallback for 'other' and any unexpected roles. */
function GenericRoleCard({ assessment }: { assessment: LandAssessment }) {
  const { investmentScore, rating, suitability, areaHa, province, region } = assessment;

  const ratingColor =
    rating === 'excellent' ? 'text-emerald-600 bg-emerald-500/[0.08] border-emerald-500/25' :
    rating === 'good'      ? 'text-blue-600 bg-blue-500/[0.08] border-blue-500/25' :
    rating === 'moderate'  ? 'text-orange-500 bg-orange-500/[0.08] border-orange-500/25' :
                             'text-red-500 bg-red-500/[0.08] border-red-500/25';

  const scoreEntries: [string, number][] = [
    ['Soil quality',      suitability.soilQuality],
    ['Water access',      suitability.waterAccess],
    ['Climate',           suitability.climate],
    ['Market access',     suitability.marketAccess],
    ['Reg. safety',       suitability.regulatorySafety],
    ['Vegetation health', suitability.vegetationHealth],
  ];

  return (
    <div className="space-y-2.5">
      <div className={`rounded-xl border p-3 ${ratingColor}`}>
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 shrink-0 opacity-80" />
          <div>
            <div className="text-sm font-bold capitalize">{rating} land potential</div>
            <div className="text-[11px] opacity-70">
              Investment score {investmentScore}/100 · {areaHa.toLocaleString()} ha · {province}, {region}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#35b779]/[0.15] p-3 bg-[#35b779]/[0.04] space-y-1.5">
        {scoreEntries.map(([label, val]) => {
          const color = val >= 65 ? 'bg-emerald-500' : val >= 45 ? 'bg-orange-400' : 'bg-red-400';
          return (
            <div key={label}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[10px] text-[#6b7280]">{label}</span>
                <span className="text-[10px] font-mono text-[#374151]">{val}</span>
              </div>
              <div className="h-1 rounded-full bg-[#e5e7eb] overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${val}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
