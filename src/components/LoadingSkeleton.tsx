'use client';

export function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 animate-pulse" role="status" aria-busy="true" aria-label="Loading statistics">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-3.5 h-3.5 rounded bg-[#35b779]/[0.08]" />
            <div className="h-2 w-14 rounded bg-[#35b779]/[0.08]" />
          </div>
          <div className="h-5 w-20 rounded bg-[#35b779]/[0.10] mb-1" />
          <div className="h-2 w-10 rounded bg-[#35b779]/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-busy="true" aria-label="Loading chart">
      <div className="h-2 w-24 rounded bg-[#35b779]/[0.08] mb-3" />
      <div className="h-[160px] rounded-lg bg-[#35b779]/[0.05] flex items-end gap-1 p-4">
        {[40, 65, 80, 55, 70, 45].map((h, i) => (
          <div key={i} className="flex-1 flex gap-0.5">
            <div
              className="flex-1 rounded-t bg-[#35b779]/[0.08]"
              style={{ height: `${h}%` }}
            />
            <div
              className="flex-1 rounded-t bg-[#35b779]/[0.06]"
              style={{ height: `${h * 0.3}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-1.5 animate-pulse" role="status" aria-busy="true" aria-label="Loading list">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-2 py-2 rounded-md bg-[#35b779]/[0.05]"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#35b779]/[0.10]" />
            <div className="h-2.5 rounded bg-[#35b779]/[0.10]" style={{ width: 60 + Math.random() * 40 }} />
          </div>
          <div className="h-2.5 w-8 rounded bg-[#35b779]/[0.08]" />
        </div>
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="h-full flex flex-col gap-3 p-3">
      <StatSkeleton />
      <ChartSkeleton />
      <ListSkeleton />
    </div>
  );
}
