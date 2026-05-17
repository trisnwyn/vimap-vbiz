'use client';

import { TreePine, Newspaper, BarChart3, Shield, Layers, Eye, EyeOff, Sparkles, Route } from 'lucide-react';
import SearchBar from './SearchBar';
import ExportReport from './ExportReport';

type Tab = 'stats' | 'news' | 'eudr' | 'ai';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  showHeatmap: boolean;
  showProvinces: boolean;
  showNews: boolean;
  showFlows: boolean;
  onToggleHeatmap: () => void;
  onToggleProvinces: () => void;
  onToggleNews: () => void;
  onToggleFlows: () => void;
  onProvinceSearch: (id: string) => void;
  year: number;
  selectedProvince: string | null;
}

export default function Header({
  activeTab,
  onTabChange,
  showHeatmap,
  showProvinces,
  showNews,
  showFlows,
  onToggleHeatmap,
  onToggleProvinces,
  onToggleNews,
  onToggleFlows,
  onProvinceSearch,
  year,
  selectedProvince,
}: HeaderProps) {
  return (
    <header className="glass-panel flex items-center justify-between px-5 py-3 z-50 border-b border-white/[0.06]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
          <TreePine className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white leading-none">
            ViMap
            <span className="text-accent ml-1 text-xs font-medium align-top">BETA</span>
          </h1>
          <p className="text-[10px] text-gray-500 leading-none mt-0.5">
            Vietnam Land Use & Cover Intelligence
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {([
          { id: 'stats' as Tab, label: 'Statistics', icon: BarChart3 },
          { id: 'news' as Tab, label: 'News Intel', icon: Newspaper },
          { id: 'eudr' as Tab, label: 'EUDR Check', icon: Shield },
          { id: 'ai' as Tab, label: 'AI Insights', icon: Sparkles },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === id
                ? 'bg-accent/15 text-accent'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <SearchBar onSelect={onProvinceSearch} />

        <div className="flex items-center gap-1">
          {([
            { key: 'provinces', label: 'Provinces', active: showProvinces, toggle: onToggleProvinces, icon: Layers },
            { key: 'heatmap', label: 'Forest Loss', active: showHeatmap, toggle: onToggleHeatmap, icon: showHeatmap ? Eye : EyeOff },
            { key: 'news', label: 'News', active: showNews, toggle: onToggleNews, icon: Newspaper },
            { key: 'flows', label: 'Flows', active: showFlows, toggle: onToggleFlows, icon: Route },
          ]).map(({ key, label, active, toggle, icon: Icon }) => (
            <button
              key={key}
              onClick={toggle}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
              title={`Toggle ${label}`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        <ExportReport year={year} selectedProvince={selectedProvince} />

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/[0.06]">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-mono text-white font-bold">{year}</span>
        </div>
      </div>
    </header>
  );
}
