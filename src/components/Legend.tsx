'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Legend() {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-24 right-3 sm:right-4 glass-panel rounded-lg z-10 animate-fade-in hidden sm:block max-h-[calc(100%-140px)] overflow-y-auto w-[180px]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#35b779]/[0.06] transition-colors"
        aria-expanded={open}
        aria-label="Toggle legend"
      >
        <span className="text-[11px] text-[#374151] uppercase tracking-wider font-medium">Legend</span>
        <ChevronDown className={`w-3 h-3 text-[#6b7280] transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      {!open ? null : <div className="px-3 pb-3">
      <h4 className="text-xs text-[#374151] uppercase tracking-wider mb-2 font-medium">
        Province Loss Rate
      </h4>
      <div className="flex items-center gap-1 mb-2.5">
        <div className="flex h-2 rounded-full overflow-hidden">
          {['#35b779', '#52b788', '#fdd835', '#ff9800', '#f44336'].map((c) => (
            <div key={c} className="w-6 h-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[11px] text-[#6b7280] mb-3" style={{ width: 120 }}>
        <span>0%</span>
        <span>1%</span>
        <span>2%</span>
        <span>3%+</span>
      </div>

      <h4 className="text-xs text-[#374151] uppercase tracking-wider mb-1.5 font-medium">
        Circle Size
      </h4>
      <div className="flex items-end gap-2 mb-3">
        {[{ r: 4, label: '5K' }, { r: 8, label: '100K' }, { r: 14, label: '500K+' }].map(({ r, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <div
              className="rounded-full border border-[#35b779]/30 bg-[#35b779]/20"
              style={{ width: r * 2, height: r * 2 }}
            />
            <span className="text-[11px] text-[#6b7280]">{label}</span>
          </div>
        ))}
        <span className="text-[11px] text-[#6b7280] ml-1">ha</span>
      </div>

      <h4 className="text-xs text-[#374151] uppercase tracking-wider mb-1.5 font-medium">
        News Category
      </h4>
      <div className="space-y-1">
        {[
          { color: '#c0392b', label: 'EUDR' },
          { color: '#d4820a', label: 'Deforestation' },
          { color: '#2980b9', label: 'Policy' },
          { color: '#27ae60', label: 'Climate' },
          { color: '#a67c00', label: 'Agriculture' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-[#374151]">{label}</span>
          </div>
        ))}
      </div>
      </div>}
    </div>
  );
}
