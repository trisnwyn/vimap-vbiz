'use client';

import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Flame, Droplets, TreePine, TrendingDown } from 'lucide-react';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';

interface AlertTickerProps {
  year: number;
}

interface Alert {
  id: string;
  icon: typeof AlertTriangle;
  iconColor: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

function generateAlerts(year: number): Alert[] {
  const alerts: Alert[] = [];
  let idx = 0;

  // High-loss provinces
  const highLoss = provinces
    .filter((p) => interpolateYear(p.lossRate, year) >= 0.02)
    .sort((a, b) => interpolateYear(b.lossRate, year) - interpolateYear(a.lossRate, year));

  for (const p of highLoss.slice(0, 3)) {
    const rate = (interpolateYear(p.lossRate, year) * 100).toFixed(1);
    alerts.push({
      id: `loss_${idx++}`,
      icon: TrendingDown,
      iconColor: 'text-red-400',
      message: `${p.name}: ${rate}% annual forest loss detected — ${p.primaryCrop} expansion zone`,
      severity: 'critical',
    });
  }

  // Fire risk alerts (dry season)
  const fireRisk = provinces.filter((p) =>
    ['Dak Lak', 'Dak Nong', 'Gia Lai', 'Binh Thuan', 'Ninh Thuan'].includes(p.name),
  );
  if (fireRisk.length > 0 && year >= 2010) {
    alerts.push({
      id: `fire_${idx++}`,
      icon: Flame,
      iconColor: 'text-orange-400',
      message: `Wildfire risk elevated in Central Highlands dry corridor — ${fireRisk.length} provinces under watch`,
      severity: 'warning',
    });
  }

  // Flood risk from deforestation
  const floodRisk = provinces.filter(
    (p) =>
      ['North Central', 'South Central'].includes(p.region) &&
      interpolateYear(p.lossRate, year) > 0.005,
  );
  if (floodRisk.length > 2) {
    alerts.push({
      id: `flood_${idx++}`,
      icon: Droplets,
      iconColor: 'text-blue-400',
      message: `Monsoon flood risk increased in ${floodRisk.length} coastal provinces due to watershed degradation`,
      severity: 'warning',
    });
  }

  // Reforestation progress
  const reforest = provinces.filter((p) => {
    const cover2000 = interpolateYear(p.forestCover, 2000);
    const coverNow = interpolateYear(p.forestCover, year);
    return coverNow > cover2000 * 1.3;
  });
  if (reforest.length > 5) {
    alerts.push({
      id: `reforest_${idx++}`,
      icon: TreePine,
      iconColor: 'text-green-400',
      message: `Reforestation success: ${reforest.length} provinces show >30% forest cover growth since 2000`,
      severity: 'info',
    });
  }

  // EUDR cutoff warning
  if (year >= 2020) {
    const atRisk = provinces.filter(
      (p) =>
        ['coffee', 'rubber'].includes(p.primaryCrop) &&
        interpolateYear(p.lossRate, year) > 0.01,
    );
    if (atRisk.length > 0) {
      alerts.push({
        id: `eudr_${idx++}`,
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
        message: `EUDR alert: ${atRisk.length} commodity provinces show post-2020 deforestation — trade compliance at risk`,
        severity: 'critical',
      });
    }
  }

  // General coverage stat
  const totalCover = provinces.reduce((s, p) => s + interpolateYear(p.forestCover, year), 0);
  const pct = ((totalCover / 33121000) * 100).toFixed(1);
  alerts.push({
    id: `coverage_${idx++}`,
    icon: TreePine,
    iconColor: 'text-accent',
    message: `Vietnam forest coverage at ${pct}% of total land area (${(totalCover / 1e6).toFixed(2)}M ha) in ${year}`,
    severity: 'info',
  });

  return alerts;
}

export default function AlertTicker({ year }: AlertTickerProps) {
  const alerts = useMemo(() => generateAlerts(year), [year]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    setCurrentIndex(0);
  }, [year]);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((i) => (i + 1) % alerts.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  const alert = alerts[currentIndex];
  const Icon = alert.icon;

  const borderColor =
    alert.severity === 'critical'
      ? 'border-red-500/20'
      : alert.severity === 'warning'
        ? 'border-amber-500/20'
        : 'border-accent/20';

  return (
    <div
      className={`flex items-center gap-2 px-4 py-1.5 bg-[#35b779]/[0.04] border-b ${borderColor} transition-all duration-300`}
    >
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" aria-hidden="true" />
        <span className="text-[11px] font-bold text-[#374151] uppercase tracking-wider">Live</span>
      </div>

      <div
        aria-live="polite"
        className={`flex-1 flex items-center gap-2 overflow-hidden transition-opacity duration-300 ${
          fade ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Icon className={`w-3 h-3 ${alert.iconColor} shrink-0`} />
        <p className="text-xs text-[#1f2937] truncate">{alert.message}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {alerts.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFade(false);
              setTimeout(() => {
                setCurrentIndex(i);
                setFade(true);
              }, 150);
            }}
            className={`w-1 h-1 rounded-full transition-all ${
              i === currentIndex ? 'bg-accent w-2.5' : 'bg-[#9ca3af]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
