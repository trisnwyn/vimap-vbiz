'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-[#35b779]/[0.15] bg-[#35b779]/[0.04] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#35b779]/[0.04] transition-colors"
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-semibold text-[#111827] uppercase tracking-wider truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[10px] text-[#6b7280] truncate">{subtitle}</div>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#6b7280] transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 animate-fade-in">
          {children}
        </div>
      )}
    </section>
  );
}
