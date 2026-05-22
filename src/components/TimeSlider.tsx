'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface TimeSliderProps {
  value: number;
  onChange: (year: number) => void;
  min?: number;
  max?: number;
}

const YEAR_MARKERS = [2001, 2005, 2010, 2015, 2020, 2024];

export default function TimeSlider({ value, onChange, min = 2001, max = 2024 }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    setPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const next = valueRef.current + 1;
        if (next > max) {
          stop();
          return;
        }
        onChange(next);
      }, 600);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, max, onChange, stop]);

  const togglePlay = () => {
    if (playing) {
      stop();
    } else {
      if (value >= max) onChange(min);
      setPlaying(true);
    }
  };

  return (
    <div className="glass-panel px-5 py-3 time-slider animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { stop(); onChange(min); }}
            className="p-1.5 rounded-md text-[#374151] hover:text-[#111827] glass-btn transition-all"
            title="Reset to start"
            tabIndex={0}
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg glass-btn !bg-accent/15 !border-accent/25 text-accent hover:!bg-accent/25 transition-all"
            title={playing ? 'Pause' : 'Play timeline'}
            tabIndex={0}
            aria-label={playing ? 'Pause timeline' : 'Play timeline'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => { stop(); onChange(max); }}
            className="p-1.5 rounded-md text-[#374151] hover:text-[#111827] glass-btn transition-all"
            title="Skip to end"
            tabIndex={0}
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => { stop(); onChange(Number(e.target.value)); }}
            className="w-full"
          />
          <div className="flex justify-between px-1">
            {YEAR_MARKERS.map((y) => (
              <button
                key={y}
                onClick={() => { stop(); onChange(y); }}
                className={`text-[11px] font-mono transition-colors ${
                  y === value ? 'text-accent font-bold' : 'text-[#9ca3af] hover:text-[#374151]'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="text-right min-w-[80px]">
          <div className="text-2xl font-mono font-bold text-[#111827] leading-none">{value}</div>
          <div className="text-[11px] text-[#6b7280] mt-0.5">
            {value <= 2020 ? 'Pre-EUDR cutoff' : 'Post-EUDR cutoff'}
          </div>
        </div>
      </div>
    </div>
  );
}
