'use client';

export default function Legend() {
  return (
    <div className="absolute bottom-20 left-4 glass-panel rounded-lg p-3 z-10 animate-fade-in">
      <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-medium">
        Province Loss Rate
      </h4>
      <div className="flex items-center gap-1 mb-2.5">
        <div className="flex h-2 rounded-full overflow-hidden">
          {['#00dc82', '#66bb6a', '#fdd835', '#ff9800', '#f44336'].map((c) => (
            <div key={c} className="w-6 h-full" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex justify-between text-[8px] text-gray-500 mb-3" style={{ width: 120 }}>
        <span>0%</span>
        <span>1%</span>
        <span>2%</span>
        <span>3%+</span>
      </div>

      <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">
        Circle Size
      </h4>
      <div className="flex items-end gap-2 mb-3">
        {[{ r: 4, label: '5K' }, { r: 8, label: '100K' }, { r: 14, label: '500K+' }].map(({ r, label }) => (
          <div key={label} className="flex flex-col items-center gap-0.5">
            <div
              className="rounded-full border border-white/20 bg-white/10"
              style={{ width: r * 2, height: r * 2 }}
            />
            <span className="text-[7px] text-gray-500">{label}</span>
          </div>
        ))}
        <span className="text-[8px] text-gray-500 ml-1">ha</span>
      </div>

      <h4 className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-medium">
        News Category
      </h4>
      <div className="space-y-1">
        {[
          { color: '#ff6b6b', label: 'EUDR' },
          { color: '#ffa726', label: 'Deforestation' },
          { color: '#42a5f5', label: 'Policy' },
          { color: '#66bb6a', label: 'Climate' },
          { color: '#e8d44d', label: 'Agriculture' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-gray-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
