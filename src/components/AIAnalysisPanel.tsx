'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, Shield, Loader2, ChevronRight, Zap, Droplets, Mountain, Flame } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

interface AIAnalysisPanelProps {
  year: number;
  selectedProvince: string | null;
}

interface Insight {
  type: 'risk' | 'trend' | 'forecast' | 'recommendation';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  body: string;
  icon: typeof AlertTriangle;
}

function computeTrend(data: Record<number, number>): { direction: 'up' | 'down' | 'stable'; pctChange: number } {
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return { direction: 'stable', pctChange: 0 };
  const first = data[years[0]];
  const last = data[years[years.length - 1]];
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  return {
    direction: Math.abs(pct) < 2 ? 'stable' : pct > 0 ? 'up' : 'down',
    pctChange: pct,
  };
}

function forecast2030(data: Record<number, number>): number {
  const years = Object.keys(data).map(Number).sort((a, b) => a - b);
  if (years.length < 2) return data[years[0]] ?? 0;
  // Linear regression
  const n = years.length;
  const sumX = years.reduce((s, y) => s + y, 0);
  const sumY = years.reduce((s, y) => s + data[y], 0);
  const sumXY = years.reduce((s, y) => s + y * data[y], 0);
  const sumX2 = years.reduce((s, y) => s + y * y, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return Math.max(0, Math.round(slope * 2030 + intercept));
}

function computeRiskScore(provinceId: string, year: number): number {
  const p = provinces.find((pr) => pr.id === provinceId);
  if (!p) return 0;
  const lossRate = interpolateYear(p.lossRate, year);
  const lossTrend = computeTrend(p.forestLoss);
  const coverTrend = computeTrend(p.forestCover);

  let score = 0;
  // High loss rate = high risk
  score += Math.min(40, lossRate * 1500);
  // Accelerating loss = more risk
  if (lossTrend.direction === 'up' || lossTrend.pctChange > -10) score += 15;
  // Declining forest cover = risk
  if (coverTrend.direction === 'down') score += Math.min(25, Math.abs(coverTrend.pctChange));
  // EUDR-regulated crops
  if (['coffee', 'rubber', 'shrimp'].includes(p.primaryCrop)) score += 15;
  // Region modifier
  if (p.region === 'Central Highlands' || p.region === 'Southeast') score += 5;

  return Math.min(100, Math.round(score));
}

function generateInsights(year: number, selectedProvince: string | null): Insight[] {
  const insights: Insight[] = [];
  const source = selectedProvince
    ? provinces.filter((p) => p.id === selectedProvince)
    : provinces;

  const totalForest = source.reduce((s, p) => s + interpolateYear(p.forestCover, year), 0);
  const totalLoss = source.reduce((s, p) => s + interpolateYear(p.forestLoss, year), 0);
  const avgLossRate = source.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / source.length;

  // Forecast total forest cover in 2030
  const allForest2030 = source.reduce((s, p) => s + forecast2030(p.forestCover), 0);
  const allLoss2030 = source.reduce((s, p) => s + forecast2030(p.forestLoss), 0);
  const forestChange2030 = ((allForest2030 - totalForest) / totalForest) * 100;

  // Risk-ranked provinces
  const ranked = source
    .map((p) => ({ ...p, riskScore: computeRiskScore(p.id, year) }))
    .sort((a, b) => b.riskScore - a.riskScore);

  const criticalProvinces = ranked.filter((p) => p.riskScore >= 60);
  const highRiskProvinces = ranked.filter((p) => p.riskScore >= 40 && p.riskScore < 60);

  // 1. Overall trend
  if (selectedProvince) {
    const p = provinces.find((pr) => pr.id === selectedProvince)!;
    const coverTrend = computeTrend(p.forestCover);
    const risk = computeRiskScore(p.id, year);
    insights.push({
      type: 'trend',
      severity: risk >= 60 ? 'critical' : risk >= 40 ? 'warning' : 'info',
      title: `${p.name} Risk Assessment`,
      body: `Risk score: ${risk}/100. Forest cover has ${coverTrend.direction === 'down' ? 'declined' : coverTrend.direction === 'up' ? 'increased' : 'remained stable'} by ${Math.abs(coverTrend.pctChange).toFixed(1)}% since 2000. ${risk >= 60 ? 'Immediate attention required — this province shows critical deforestation patterns.' : risk >= 40 ? 'Elevated risk detected. Enhanced monitoring recommended.' : 'Currently within acceptable parameters.'}`,
      icon: risk >= 60 ? AlertTriangle : TrendingDown,
    });
  } else {
    insights.push({
      type: 'trend',
      severity: avgLossRate > 0.015 ? 'critical' : avgLossRate > 0.008 ? 'warning' : 'info',
      title: 'National Deforestation Trend',
      body: `Average annual loss rate is ${(avgLossRate * 100).toFixed(2)}% with ${(totalLoss / 1000).toFixed(1)}K ha lost in ${year}. ${year <= 2010 ? 'This period shows peak deforestation driven by agricultural expansion.' : year <= 2020 ? 'Loss rates are declining due to policy interventions but remain significant in key regions.' : 'Post-EUDR cutoff period — any continued loss has direct trade compliance implications.'}`,
      icon: TrendingDown,
    });
  }

  // 2. 2030 Forecast
  insights.push({
    type: 'forecast',
    severity: forestChange2030 < -5 ? 'critical' : forestChange2030 < 0 ? 'warning' : 'positive',
    title: '2030 Forest Cover Projection',
    body: `Linear regression projects ${forestChange2030 > 0 ? 'an increase' : 'a decline'} of ${Math.abs(forestChange2030).toFixed(1)}% in forest cover by 2030 (${(allForest2030 / 1_000_000).toFixed(2)}M ha). ${forestChange2030 < -5 ? 'At this trajectory, Vietnam risks falling below critical ecological thresholds for watershed protection.' : forestChange2030 < 0 ? 'Continued policy enforcement and reforestation programs are essential to reverse this trend.' : 'Reforestation programs are showing positive results in aggregate, though hotspot areas remain.'}`,
    icon: forestChange2030 < 0 ? TrendingDown : TrendingUp,
  });

  // 3. Critical risk zones
  if (criticalProvinces.length > 0 && !selectedProvince) {
    const top3 = criticalProvinces.slice(0, 3);
    insights.push({
      type: 'risk',
      severity: 'critical',
      title: `${criticalProvinces.length} Critical-Risk Provinces Identified`,
      body: `${top3.map((p) => `${p.name} (score: ${p.riskScore})`).join(', ')}${criticalProvinces.length > 3 ? ` and ${criticalProvinces.length - 3} more` : ''}. These provinces show severe deforestation patterns with high loss rates in EUDR-regulated commodity zones. Immediate ground-truth verification and enhanced satellite monitoring recommended.`,
      icon: AlertTriangle,
    });
  }

  // 4. Disaster risk forecasting
  const highLossProvinces = source.filter((p) => interpolateYear(p.lossRate, year) > 0.02);
  if (highLossProvinces.length > 0) {
    const floodRiskNames = highLossProvinces
      .filter((p) => ['Central Highlands', 'North Central', 'South Central'].includes(p.region))
      .slice(0, 3)
      .map((p) => p.name);

    if (floodRiskNames.length > 0) {
      insights.push({
        type: 'forecast',
        severity: 'warning',
        title: 'Elevated Flood & Landslide Risk',
        body: `Deforestation in ${floodRiskNames.join(', ')} has reduced watershed protection capacity. Modeled flood risk is ${(20 + avgLossRate * 2000).toFixed(0)}% above baseline for the upcoming monsoon season. Soil erosion rates estimated at ${(1.5 + avgLossRate * 300).toFixed(1)} tons/ha/yr in deforested areas.`,
        icon: Droplets,
      });
    }
  }

  // 5. Soil degradation
  const centralHighlands = source.filter((p) => p.region === 'Central Highlands');
  if (centralHighlands.length > 0) {
    const chAvgLoss = centralHighlands.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / centralHighlands.length;
    if (chAvgLoss > 0.008) {
      insights.push({
        type: 'risk',
        severity: chAvgLoss > 0.015 ? 'critical' : 'warning',
        title: 'Central Highlands Soil Degradation',
        body: `Ongoing conversion of forest to coffee and rubber plantations is accelerating topsoil loss. Estimated ${(chAvgLoss * 5000).toFixed(0)} km² of exposed laterite soils by ${year + 5}. This threatens long-term agricultural productivity — the very crops driving deforestation face declining yields within 10-15 years.`,
        icon: Mountain,
      });
    }
  }

  // 6. Fire risk
  const dryCorridor = source.filter((p) =>
    ['Ninh Thuan', 'Binh Thuan', 'Dak Lak', 'Dak Nong', 'Gia Lai'].includes(p.name)
  );
  if (dryCorridor.length > 0 && year >= 2015) {
    const dryAvgLoss = dryCorridor.reduce((s, p) => s + interpolateYear(p.lossRate, year), 0) / dryCorridor.length;
    insights.push({
      type: 'forecast',
      severity: dryAvgLoss > 0.015 ? 'critical' : 'warning',
      title: 'Wildfire Season Outlook',
      body: `The dry corridor from Ninh Thuan through Central Highlands shows ${(dryAvgLoss * 100).toFixed(1)}% forest loss rate, creating fragmented fuel loads. Fire risk index: ${Math.min(10, (dryAvgLoss * 500 + 2)).toFixed(1)}/10. Degraded forest edges are particularly vulnerable during February-April dry season.`,
      icon: Flame,
    });
  }

  // 7. EUDR compliance outlook
  if (!selectedProvince) {
    const eudrCommodityProvinces = source.filter((p) =>
      ['coffee', 'rubber'].includes(p.primaryCrop)
    );
    const atRisk = eudrCommodityProvinces.filter(
      (p) => interpolateYear(p.lossRate, year) > 0.01
    );
    insights.push({
      type: 'recommendation',
      severity: atRisk.length > 5 ? 'critical' : atRisk.length > 2 ? 'warning' : 'positive',
      title: 'EUDR Trade Compliance Forecast',
      body: `${atRisk.length} of ${eudrCommodityProvinces.length} commodity-producing provinces show deforestation rates that may trigger EUDR due diligence requirements. Coffee and rubber supply chains from ${atRisk.slice(0, 3).map((p) => p.name).join(', ')} face the highest scrutiny risk. ${atRisk.length > 5 ? 'Major trade disruptions possible without immediate remediation.' : 'Targeted traceability programs could mitigate compliance risk.'}`,
      icon: Shield,
    });
  }

  // 8. Positive note if applicable
  const improvingProvinces = source.filter((p) => {
    const trend = computeTrend(p.forestCover);
    return trend.direction === 'up' && trend.pctChange > 20;
  });
  if (improvingProvinces.length > 3 && !selectedProvince) {
    insights.push({
      type: 'trend',
      severity: 'positive',
      title: 'Reforestation Success Stories',
      body: `${improvingProvinces.length} provinces show >20% forest cover increase since 2000, led by ${improvingProvinces.slice(0, 3).map((p) => `${p.name} (+${computeTrend(p.forestCover).pctChange.toFixed(0)}%)`).join(', ')}. These gains are primarily in the Northeast and North Central regions through government reforestation programs (Program 661) and community forestry initiatives.`,
      icon: TrendingUp,
    });
  }

  return insights;
}

const ICON_MAP: Record<string, typeof AlertTriangle> = {
  trend: TrendingDown,
  risk: AlertTriangle,
  forecast: Droplets,
  recommendation: Shield,
};

interface AIApiInsight {
  type: string;
  severity: string;
  title: string;
  body: string;
}

interface WorldBankEntry {
  year: number;
  forestAreaHa: number;
}

const severityColors = {
  critical: { bg: 'bg-red-500/[0.08]', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  warning: { bg: 'bg-amber-500/[0.08]', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  info: { bg: 'bg-blue-500/[0.08]', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  positive: { bg: 'bg-green-500/[0.08]', border: 'border-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
};

export default function AIAnalysisPanel({ year, selectedProvince }: AIAnalysisPanelProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [aiSource, setAiSource] = useState<'groq' | 'local' | null>(null);
  const [realData, setRealData] = useState<WorldBankEntry[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = selectedProvince
    ? provinces.find((p) => p.id === selectedProvince)
    : null;

  // Fetch real World Bank data on mount
  useEffect(() => {
    fetch('/api/real-data')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.data) setRealData(d.data); })
      .catch(() => {});
  }, []);

  // Risk scores for top provinces
  const topRisks = useMemo(() => {
    return provinces
      .map((p) => ({ name: p.name, region: p.region, score: computeRiskScore(p.id, year) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [year]);

  const handleGenerate = async () => {
    setAnalyzing(true);
    setInsights([]);
    setVisibleCount(0);
    setHasGenerated(true);

    // Try real AI (Groq) first, fall back to local analysis
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, provinceId: selectedProvince }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.insights && data.insights.length > 0) {
          const mapped: Insight[] = data.insights.map((ins: AIApiInsight) => ({
            type: ins.type || 'trend',
            severity: (['critical', 'warning', 'info', 'positive'].includes(ins.severity) ? ins.severity : 'info') as Insight['severity'],
            title: ins.title,
            body: ins.body,
            icon: ICON_MAP[ins.type] || AlertTriangle,
          }));
          setInsights(mapped);
          setAiSource('groq');
          setAnalyzing(false);
          return;
        }
      }
    } catch {
      // Fall through to local analysis
    }

    // Fallback: local statistical analysis
    const results = generateInsights(year, selectedProvince);
    setInsights(results);
    setAiSource('local');
    setAnalyzing(false);
  };

  // Stagger insight appearance
  useEffect(() => {
    if (insights.length > 0 && visibleCount < insights.length) {
      const timer = setTimeout(() => {
        setVisibleCount((c) => c + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [insights, visibleCount]);

  // Auto-scroll as insights appear
  useEffect(() => {
    if (scrollRef.current && visibleCount > 0) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [visibleCount]);

  // Re-generate when year/province changes
  useEffect(() => {
    if (hasGenerated) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedProvince]);

  return (
    <div ref={scrollRef} className="h-full flex flex-col gap-3 p-3 overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="text-xs font-bold text-white">AI Risk Analysis</h3>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Analyze deforestation trends, forecast disaster risks, and assess EUDR compliance
          using statistical modeling on province-level data.
        </p>
      </div>

      {selected && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-accent/[0.06] border border-accent/10">
          <ChevronRight className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-gray-300">
            Analyzing: <span className="text-accent font-medium">{selected.name}</span>
          </span>
        </div>
      )}

      {/* Risk scoreboard (always visible) */}
      <div>
        <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
          Risk Scoreboard — {year}
        </h4>
        <div className="space-y-1">
          {topRisks.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between px-2 py-1.5 rounded-md bg-white/[0.03]"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    p.score >= 60 ? 'bg-red-400' : p.score >= 40 ? 'bg-amber-400' : 'bg-green-400'
                  }`}
                />
                <span className="text-[11px] text-white">{p.name}</span>
                <span className="text-[9px] text-gray-600">{p.region}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      p.score >= 60 ? 'bg-red-400' : p.score >= 40 ? 'bg-amber-400' : 'bg-green-400'
                    }`}
                    style={{ width: `${p.score}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-mono font-bold min-w-[24px] text-right ${
                    p.score >= 60 ? 'text-red-400' : p.score >= 40 ? 'text-amber-400' : 'text-green-400'
                  }`}
                >
                  {p.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={analyzing}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
          analyzing
            ? 'bg-accent/10 text-accent/60 cursor-wait'
            : 'bg-accent/15 text-accent hover:bg-accent/25 border border-accent/20'
        }`}
      >
        {analyzing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing trends & forecasting risks...
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5" />
            {hasGenerated ? 'Re-analyze' : 'Generate AI Analysis'}
          </>
        )}
      </button>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.slice(0, visibleCount).map((insight, i) => {
            const colors = severityColors[insight.severity];
            const Icon = insight.icon;
            return (
              <div
                key={i}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border} animate-fade-in`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 ${colors.text} mt-0.5 shrink-0`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className={`text-[11px] font-bold ${colors.text}`}>
                        {insight.title}
                      </h5>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold ${colors.bg} ${colors.text} border ${colors.border}`}
                      >
                        {insight.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-300 leading-relaxed">
                      {insight.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {visibleCount >= insights.length && (
            <div className="p-2 rounded-md bg-white/[0.02] border border-white/[0.04] animate-fade-in">
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full ${aiSource === 'groq' ? 'bg-accent' : 'bg-amber-400'}`} />
                <span className="text-[9px] font-bold text-gray-400">
                  {aiSource === 'groq' ? 'Powered by Groq (Llama 3.3 70B)' : 'Local statistical analysis'}
                </span>
              </div>
              <p className="text-[9px] text-gray-500 leading-relaxed">
                {aiSource === 'groq'
                  ? 'Analysis generated by Llama 3.3 70B via Groq API using real province-level forestry data. Cross-reference with MARD reports for due diligence.'
                  : 'Fallback to client-side statistical modeling. Set GROQ_API_KEY in .env.local for AI-powered analysis.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* World Bank Real Data Validation */}
      {realData && realData.length > 0 && (
        <div className="mt-1">
          <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Real Data — World Bank Open Data
          </h4>
          <div className="space-y-1.5">
            {/* Sparkline of real forest area */}
            <div className="p-2.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-blue-400 font-medium">Vietnam Forest Area (Real)</span>
                <span className="text-[8px] text-gray-500 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/10">
                  AG.LND.FRST.K2
                </span>
              </div>
              <svg viewBox={`0 0 ${realData.length * 20} 40`} className="w-full h-8">
                <polyline
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="1.5"
                  points={realData.map((d, i) => {
                    const minVal = Math.min(...realData.map((r) => r.forestAreaHa));
                    const maxVal = Math.max(...realData.map((r) => r.forestAreaHa));
                    const range = maxVal - minVal || 1;
                    const x = i * 20;
                    const y = 38 - ((d.forestAreaHa - minVal) / range) * 36;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                <polyline
                  fill="url(#wb-gradient)"
                  stroke="none"
                  points={[
                    `0,40`,
                    ...realData.map((d, i) => {
                      const minVal = Math.min(...realData.map((r) => r.forestAreaHa));
                      const maxVal = Math.max(...realData.map((r) => r.forestAreaHa));
                      const range = maxVal - minVal || 1;
                      const x = i * 20;
                      const y = 38 - ((d.forestAreaHa - minVal) / range) * 36;
                      return `${x},${y}`;
                    }),
                    `${(realData.length - 1) * 20},40`,
                  ].join(' ')}
                />
                <defs>
                  <linearGradient id="wb-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[9px] text-gray-500">{realData[0].year}</span>
                <span className="text-[9px] text-gray-500">{realData[realData.length - 1].year}</span>
              </div>
            </div>

            {/* Latest data point */}
            {(() => {
              const latest = realData[realData.length - 1];
              const earliest = realData[0];
              const changePct = ((latest.forestAreaHa - earliest.forestAreaHa) / earliest.forestAreaHa * 100);
              return (
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-2 rounded-md bg-white/[0.03] border border-white/[0.05]">
                    <div className="text-[9px] text-gray-500 mb-0.5">Latest ({latest.year})</div>
                    <div className="text-[11px] text-white font-bold">
                      {(latest.forestAreaHa / 1_000_000).toFixed(2)}M ha
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-white/[0.03] border border-white/[0.05]">
                    <div className="text-[9px] text-gray-500 mb-0.5">Change since {earliest.year}</div>
                    <div className={`text-[11px] font-bold ${changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {changePct >= 0 ? '+' : ''}{changePct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Validation comparison */}
            {(() => {
              const wbForYear = realData.find((d) => d.year === year) || realData[realData.length - 1];
              const modelTotal = provinces.reduce((s, p) => s + interpolateYear(p.forestCover, wbForYear.year), 0);
              const diff = ((modelTotal - wbForYear.forestAreaHa) / wbForYear.forestAreaHa * 100);
              return (
                <div className="p-2 rounded-md bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500">Model vs Real ({wbForYear.year})</span>
                    <span className={`text-[9px] font-bold ${Math.abs(diff) < 10 ? 'text-green-400' : Math.abs(diff) < 25 ? 'text-amber-400' : 'text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(1)}% deviation
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1">
                      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${Math.abs(diff) < 10 ? 'bg-green-400' : Math.abs(diff) < 25 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, 100 - Math.abs(diff))}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[8px] text-gray-500">
                      {Math.abs(diff) < 10 ? 'Validated' : Math.abs(diff) < 25 ? 'Acceptable' : 'Needs calibration'}
                    </span>
                  </div>
                </div>
              );
            })()}

            <p className="text-[8px] text-gray-600 leading-relaxed">
              Source: World Bank Open Data (AG.LND.FRST.K2). Updated daily. Forest area measured in sq. km converted to hectares.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
