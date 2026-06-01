'use client';

import type * as React from 'react';
import MidoriAvatar from './MidoriAvatar';

interface Props {
  children: React.ReactNode;
  streaming?: boolean;
}

export default function MidoriAnswerCard({ children, streaming }: Props) {
  return (
    <div className="relative rounded-xl border border-[#35b779]/[0.22] border-l-[3px] border-l-[#35b779] bg-gradient-to-br from-white to-[#f5faf7]/80 p-3.5">
      {/* Midori label — top-right corner */}
      <div className="absolute top-2 right-2.5 flex items-center gap-1 text-[10px] text-[#9ca3af]">
        <MidoriAvatar size="xs" />
        <span>Midori</span>
      </div>

      <div className="pr-14 text-[13px] text-[#1f2937] leading-relaxed">
        {children}
        {streaming && (
          <span className="inline-block w-1.5 h-4 align-middle bg-accent/70 ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}
