'use client';

import Image from 'next/image';

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  state?: 'idle' | 'thinking' | 'done';
  /** Use the large gem image instead of the compact avatar */
  gem?: boolean;
  className?: string;
}

const SIZES = {
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-28 h-28',
};

/** Pixel dimensions handed to next/image — kept generous for the gem portrait. */
const PIXELS: Record<keyof typeof SIZES, number> = {
  xs: 20,
  sm: 28,
  md: 40,
  lg: 64,
  xl: 112,
};

export default function MidoriAvatar({
  size = 'md',
  state = 'idle',
  gem = false,
  className = '',
}: Props) {
  const src = gem ? '/midori-gem.jpg' : '/midori-avatar.png';
  const px = PIXELS[size];

  return (
    <span
      className={`relative inline-flex shrink-0 ${SIZES[size]} ${className}`}
    >
      {/* Thinking: pulsing ping ring */}
      {state === 'thinking' && (
        <span className="absolute inset-0 rounded-full ring-2 ring-[#35b779]/50 animate-ping" />
      )}
      {/* Done: brief green glow ring */}
      {state === 'done' && (
        <span className="absolute -inset-0.5 rounded-full ring-2 ring-[#35b779]/60 shadow-[0_0_10px_rgba(53,183,121,0.55)]" />
      )}
      <Image
        src={src}
        alt="Midori"
        width={px}
        height={px}
        className="relative rounded-full object-cover w-full h-full"
        priority={size === 'xl'}
      />
    </span>
  );
}
