'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { provinces } from '@/data/provinces';

interface SearchBarProps {
  onSelect: (provinceId: string) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const results = query.length > 0
    ? provinces.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.nameVi.toLowerCase().includes(query.toLowerCase()) ||
          p.primaryCrop.toLowerCase().includes(query.toLowerCase()) ||
          p.region.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 8)
    : [];

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setQuery('');
      setOpen(false);
    },
    [onSelect],
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
        >
          <Search className="w-3 h-3" />
          <span>Search provinces...</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] border border-accent/30 min-w-[220px]">
          <Search className="w-3 h-3 text-accent shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Province, crop, region..."
            className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-gray-500"
          />
          <button
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="text-gray-500 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 glass-panel rounded-lg border border-white/[0.08] py-1 z-50 min-w-[260px] animate-fade-in max-h-[300px] overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
            >
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white truncate">
                  {p.name}
                  <span className="text-gray-500 ml-1">({p.nameVi})</span>
                </div>
                <div className="text-[9px] text-gray-500 flex gap-2">
                  <span>{p.region}</span>
                  <span>·</span>
                  <span>{p.primaryCrop}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.length > 0 && results.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 glass-panel rounded-lg border border-white/[0.08] p-3 z-50 min-w-[220px] animate-fade-in">
          <p className="text-[10px] text-gray-500 text-center">No provinces found</p>
        </div>
      )}
    </div>
  );
}
