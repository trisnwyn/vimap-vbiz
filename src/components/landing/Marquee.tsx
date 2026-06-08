'use client';

const ITEMS = [
  '63 provinces',
  '2000–2024',
  'EUDR-ready',
  'Live fire data',
  'GFW · World Bank · NASA FIRMS',
  'AI briefings by Midori',
];

export default function Marquee() {
  // Duplicate the list so the -50% translate loops seamlessly.
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="border-y border-[#5f7138]/12 bg-[#faf8f3] py-4 overflow-hidden">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {loop.map((item, i) => (
          <span key={i} className="flex items-center text-[#5f7138]/80">
            <span className="font-display italic text-lg sm:text-xl px-6">{item}</span>
            <span className="text-[#5f7138]/30">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
