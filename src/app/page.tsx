'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import StatsPanel from '@/components/StatsPanel';
import NewsPanel from '@/components/NewsPanel';
import EUDRChecker from '@/components/EUDRChecker';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import TimeSlider from '@/components/TimeSlider';
import Legend from '@/components/Legend';
import HeadlineStrip from '@/components/HeadlineStrip';
import AlertTicker from '@/components/AlertTicker';
import ProvinceDetail from '@/components/ProvinceDetail';
import BasemapSwitcher from '@/components/BasemapSwitcher';
import type { BasemapStyle } from '@/components/BasemapSwitcher';
import { provinces } from '@/data/provinces';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#060a0e]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-3 animate-spin" />
        <p className="text-xs text-gray-500">Loading map...</p>
      </div>
    </div>
  ),
});

type Tab = 'stats' | 'news' | 'eudr' | 'ai';

export default function Home() {
  const [year, setYear] = useState(2024);
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showProvinces, setShowProvinces] = useState(true);
  const [showNews, setShowNews] = useState(true);
  const [showFlows, setShowFlows] = useState(false);
  const [basemap, setBasemap] = useState<BasemapStyle>('dark');

  const [drawingMode, setDrawingMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  const handleYearChange = useCallback((v: number) => {
    setYear(v);
  }, []);

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setDrawPoints((prev) => [...prev, [lng, lat]]);
  }, []);

  const handleStartDraw = useCallback(() => {
    setDrawPoints([]);
    setDrawingMode(true);
    setActiveTab('eudr');
  }, []);

  const handleClearDraw = useCallback(() => {
    setDrawPoints([]);
    setDrawingMode(false);
  }, []);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab !== 'eudr') setDrawingMode(false);
  }, []);

  const handleProvinceSelect = useCallback((id: string | null) => {
    setSelectedProvince(id);
    if (id) setActiveTab('stats');
  }, []);

  const handleProvinceSearch = useCallback((id: string) => {
    setSelectedProvince(id);
    setActiveTab('stats');
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showHeatmap={showHeatmap}
        showProvinces={showProvinces}
        showNews={showNews}
        showFlows={showFlows}
        onToggleHeatmap={() => setShowHeatmap((p) => !p)}
        onToggleProvinces={() => setShowProvinces((p) => !p)}
        onToggleNews={() => setShowNews((p) => !p)}
        onToggleFlows={() => setShowFlows((p) => !p)}
        onProvinceSearch={handleProvinceSearch}
        year={year}
        selectedProvince={selectedProvince}
      />

      <HeadlineStrip year={year} />
      <AlertTicker year={year} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <aside className="w-[280px] shrink-0 glass-panel border-r border-white/[0.06] overflow-hidden animate-slide-left">
          {activeTab === 'stats' && (
            <StatsPanel year={year} selectedProvince={selectedProvince} />
          )}
          {activeTab === 'news' && (
            <NewsPanel
              year={year}
              selectedNewsId={selectedNewsId}
              onNewsSelect={setSelectedNewsId}
            />
          )}
          {activeTab === 'eudr' && (
            <EUDRChecker
              drawingMode={drawingMode}
              drawPoints={drawPoints}
              onStartDraw={handleStartDraw}
              onClearDraw={handleClearDraw}
            />
          )}
          {activeTab === 'ai' && (
            <AIAnalysisPanel
              year={year}
              selectedProvince={selectedProvince}
            />
          )}
        </aside>

        {/* Map */}
        <main className="flex-1 relative overflow-hidden">
          <MapView
            year={year}
            showNews={showNews}
            showHeatmap={showHeatmap}
            showProvinces={showProvinces}
            showFlows={showFlows}
            basemap={basemap}
            drawingMode={drawingMode}
            drawPoints={drawPoints}
            onMapClick={handleMapClick}
            onProvinceSelect={handleProvinceSelect}
            onNewsSelect={(id) => {
              setSelectedNewsId(id);
              if (id) setActiveTab('news');
            }}
          />

          {/* Province detail flyout */}
          {selectedProvince && (
            <ProvinceDetail
              provinceId={selectedProvince}
              year={year}
              onClose={() => setSelectedProvince(null)}
            />
          )}

          <BasemapSwitcher value={basemap} onChange={setBasemap} />
          <Legend />
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <TimeSlider value={year} onChange={handleYearChange} />
          </div>
        </main>
      </div>
    </div>
  );
}
