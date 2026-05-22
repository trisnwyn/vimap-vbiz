export const categoryColors: Record<string, string> = {
  eudr: '#ff6b6b',
  deforestation: '#ffa726',
  policy: '#42a5f5',
  climate: '#66bb6a',
  agriculture: '#e8d44d',
};

export const severityColors = {
  critical: { bg: 'bg-red-500/[0.08]', border: 'border-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  warning: { bg: 'bg-amber-500/[0.08]', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  info: { bg: 'bg-blue-500/[0.08]', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  positive: { bg: 'bg-green-500/[0.08]', border: 'border-green-500/20', text: 'text-green-400', dot: 'bg-green-400' },
} as const;

export type Severity = keyof typeof severityColors;

export const riskColors = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', bar: 'bg-red-400', badge: 'bg-red-500/15 text-red-400' },
  elevated: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', bar: 'bg-amber-400', badge: 'bg-amber-500/15 text-amber-400' },
  moderate: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', bar: 'bg-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400' },
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', bar: 'bg-green-400', badge: 'bg-green-500/15 text-green-400' },
} as const;

export const commodityColors: Record<string, string> = {
  coffee: '#c084fc',
  rubber: '#fb923c',
  timber: '#4ade80',
  shrimp: '#38bdf8',
};
