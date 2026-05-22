'use client';

import { useState } from 'react';
import { Map, Satellite, Mountain } from 'lucide-react';

export type BasemapStyle = 'dark' | 'satellite' | 'voyager';

interface BasemapSwitcherProps {
  value: BasemapStyle;
  onChange: (style: BasemapStyle) => void;
}

const STYLES: { id: BasemapStyle; label: string; icon: typeof Map }[] = [
  { id: 'dark', label: 'Dark', icon: Map },
  { id: 'satellite', label: 'Satellite', icon: Satellite },
  { id: 'voyager', label: 'Terrain', icon: Mountain },
];

export const BASEMAP_URLS: Record<BasemapStyle, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  satellite: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
};

// Custom satellite-like style using free ESRI tiles
export function getSatelliteStyle(): object {
  return {
    version: 8,
    sources: {
      'esri-world': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Esri World Imagery',
        maxzoom: 18,
      },
    },
    layers: [
      {
        id: 'esri-world-layer',
        type: 'raster',
        source: 'esri-world',
        minzoom: 0,
        maxzoom: 18,
      },
    ],
  };
}

export default function BasemapSwitcher({ value, onChange }: BasemapSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-16 right-3 z-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center text-gray-400 hover:text-white transition-colors border border-white/[0.08]"
        title="Change basemap"
      >
        <Map className="w-4 h-4" />
      </button>

      {open && (
        <div role="menu" className="absolute top-10 right-0 glass-panel rounded-lg border border-white/[0.08] p-1.5 animate-fade-in min-w-[120px]">
          {STYLES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
                value === id
                  ? 'bg-accent/15 text-accent'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
