'use client';

import { Thermometer, CloudRain, Droplets, CalendarRange } from 'lucide-react';
import type { WeatherData } from '@/types/assessment';

interface Props {
  weather: WeatherData | null;
  source?: string;
  bare?: boolean;
}

const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

export default function WeatherCard({ weather, source, bare = false }: Props) {
  if (!weather) {
    if (bare) return <p className="text-[11px] text-gray-500">Weather data unavailable.</p>;
    return (
      <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02]">
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">
          Climate
        </div>
        <p className="text-[11px] text-gray-500">Weather data unavailable.</p>
      </div>
    );
  }

  const maxRain = Math.max(1, ...weather.monthlyRainfall);

  const body = (
    <>
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <Stat
          icon={<Thermometer className="w-3 h-3 text-orange-400" />}
          label="Avg Temp"
          value={`${weather.temperature.toFixed(1)}°C`}
          sub={`${weather.temperatureMin.toFixed(0)}–${weather.temperatureMax.toFixed(0)}°C`}
        />
        <Stat
          icon={<CloudRain className="w-3 h-3 text-blue-400" />}
          label="Rainfall"
          value={`${weather.precipitation.toLocaleString()} mm`}
          sub="12 months"
        />
        <Stat
          icon={<Droplets className="w-3 h-3 text-cyan-400" />}
          label="Soil Moist."
          value={`${(weather.soilMoisture * 100).toFixed(0)}%`}
          sub="0–7 cm avg"
        />
        <Stat
          icon={<CalendarRange className="w-3 h-3 text-emerald-400" />}
          label="Grow Days"
          value={`${weather.growingDays}`}
          sub="> 10°C"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Monthly Rainfall</span>
          <span className="text-[10px] text-gray-600 font-mono">mm</span>
        </div>
        <div className="flex items-end gap-0.5 h-[64px]" aria-label="Monthly rainfall bar chart">
          {weather.monthlyRainfall.map((mm, i) => {
            const pct = (mm / maxRain) * 100;
            const isWet = mm > 150;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${MONTHS[i]}: ${mm} mm`}>
                <div className="w-full flex flex-col-reverse" style={{ height: 48 }}>
                  <div
                    className={`w-full rounded-t ${isWet ? 'bg-blue-400/70' : 'bg-blue-400/35'}`}
                    style={{ height: `${pct}%`, transition: 'height 0.5s ease-out' }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-mono leading-none">{MONTHS[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  if (bare) return body;

  return (
    <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02] animate-fade-in">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-xs text-gray-300 font-semibold uppercase tracking-wider">
          Climate
        </h4>
        {source && <span className="text-[10px] text-gray-600 truncate">{source}</span>}
      </div>
      {body}
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/[0.04] px-2 py-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="text-sm font-bold text-white font-mono leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-gray-500 leading-tight">{sub}</div>}
    </div>
  );
}
