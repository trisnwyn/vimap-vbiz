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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[#374151] hover:text-[#111827] glass-btn transition-all"
        >
          <Search className="w-3 h-3" />
          <span>Search provinces...</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#35b779]/[0.10] border border-accent/30 min-w-[220px]">
          <Search className="w-3 h-3 text-accent shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Province, crop, region..."
            aria-label="Search provinces"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-autocomplete="list"
            className="flex-1 bg-transparent text-[11px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          <button
            onClick={() => {
              setQuery('');
              setOpen(false);
            }}
            className="text-[#6b7280] hover:text-[#111827]"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {open && results.length > 0 && (
        <div role="listbox" className="absolute top-full mt-1 left-0 right-0 glass-panel rounded-lg border border-[#35b779]/[0.20] py-1 z-50 min-w-[260px] animate-fade-in max-h-[300px] overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              role="option"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#35b779]/[0.08] transition-colors text-left"
            >
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-[#111827] truncate">
                  {p.name}
                  <span className="text-[#6b7280] ml-1">({p.nameVi})</span>
                </div>
                <div className="text-[11px] text-[#6b7280] flex gap-2">
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
        <div className="absolute top-full mt-1 left-0 right-0 glass-panel rounded-lg border border-[#35b779]/[0.20] p-3 z-50 min-w-[220px] animate-fade-in">
          <p className="text-xs text-[#6b7280] text-center">No provinces found</p>
        </div>
      )}
    </div>
  );
}
