'use client';

import { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import StatsPanel from '@/components/StatsPanel';
import NewsPanel from '@/components/NewsPanel';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';
import TimeSlider from '@/components/TimeSlider';
import Legend from '@/components/Legend';
import HeadlineStrip from '@/components/HeadlineStrip';
import AlertTicker from '@/components/AlertTicker';
import ProvinceDetail from '@/components/ProvinceDetail';
import BasemapSwitcher from '@/components/BasemapSwitcher';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DataDisclaimer } from '@/components/DataSourceBadge';
import { Menu } from 'lucide-react';
import { useMapState } from '@/hooks/useMapState';
import { useDrawingMode } from '@/hooks/useDrawingMode';
import { useURLState, useInitialURLState, type ViewMode } from '@/hooks/useURLState';

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

const LandAssessmentPanel = dynamic(() => import('@/components/assessment/LandAssessmentPanel'), {
  loading: () => (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-2 animate-spin" />
        <p className="text-xs text-gray-500">Loading assessment...</p>
      </div>
    </div>
  ),
});

type Tab = 'stats' | 'news' | 'assess' | 'ai';

function Dashboard() {
  // Read URL params once at mount — no race condition, state starts correct.
  const initial = useInitialURLState();

  const [year, setYear] = useState(initial.year);
  const [activeTab, setActiveTab] = useState<Tab>(initial.tab);
  const [viewMode, setViewMode] = useState<ViewMode>(initial.view);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(initial.province);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const mapState = useMapState();
  const {
    drawingMode, drawPoints, setDrawingMode,
    handleMapClick, handleStartDraw, handleClearDraw,
  } = useDrawingMode(setActiveTab);

  // One-way sync: state → URL (write-back only)
  useURLState({ year, tab: activeTab, province: selectedProvince, view: viewMode });

  const handleYearChange = useCallback((v: number) => setYear(v), []);

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab !== 'assess') setDrawingMode(false);
  }, [setDrawingMode]);

  const handleProvinceSelect = useCallback((id: string | null) => {
    setSelectedProvince(id);
    setShowDetail(!!id);
    // If user is on the Assess tab, keep them there so the panel updates for the new province.
    // Otherwise default to Stats so they see basic province data first.
    if (id) {
      setActiveTab((prev) => (prev === 'assess' ? 'assess' : 'stats'));
    }
  }, []);

  const handleProvinceSearch = useCallback((id: string) => {
    setSelectedProvince(id);
    setActiveTab('stats');
  }, []);

  const isIntel = viewMode === 'intel';

  // Tab content renderer reused by both layouts. `density` controls compact vs wide.
  const renderTabContent = (density: 'compact' | 'wide') => {
    switch (activeTab) {
      case 'stats':
        return <StatsPanel year={year} selectedProvince={selectedProvince} />;
      case 'news':
        return <NewsPanel year={year} selectedNewsId={selectedNewsId} onNewsSelect={setSelectedNewsId} />;
      case 'assess':
        return (
          <LandAssessmentPanel
            drawingMode={drawingMode}
            drawPoints={drawPoints}
            selectedProvinceId={selectedProvince}
            onStartDraw={handleStartDraw}
            onClearDraw={handleClearDraw}
            density={density}
          />
        );
      case 'ai':
        return (
          <ErrorBoundary fallbackTitle="AI analysis failed">
            <AIAnalysisPanel year={year} selectedProvince={selectedProvince} density={density} />
          </ErrorBoundary>
        );
    }
  };

  const mapView = (
    <ErrorBoundary fallbackTitle="Map failed to load">
      <MapView
        year={year}
        showNews={mapState.showNews}
        showHeatmap={mapState.showHeatmap}
        showProvinces={mapState.showProvinces}
        showFlows={mapState.showFlows}
        basemap={mapState.basemap}
        drawingMode={drawingMode}
        drawPoints={drawPoints}
        onMapClick={handleMapClick}
        onProvinceSelect={handleProvinceSelect}
        onNewsSelect={(id) => {
          setSelectedNewsId(id);
          if (id) setActiveTab('news');
        }}
      />
    </ErrorBoundary>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showHeatmap={mapState.showHeatmap}
        showProvinces={mapState.showProvinces}
        showNews={mapState.showNews}
        showFlows={mapState.showFlows}
        onToggleHeatmap={mapState.toggleHeatmap}
        onToggleProvinces={mapState.toggleProvinces}
        onToggleNews={mapState.toggleNews}
        onToggleFlows={mapState.toggleFlows}
        onProvinceSearch={handleProvinceSearch}
        year={year}
        selectedProvince={selectedProvince}
      />

      <div className="hidden md:block">
        <HeadlineStrip year={year} />
      </div>
      <AlertTicker year={year} />

      {isIntel ? (
        /* INTEL VIEW — intel canvas dominant, map shrunk to right-side inset */
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 flex overflow-hidden">
            <section className="flex-1 overflow-y-auto bg-background">
              {renderTabContent('wide')}
              {/* Bottom spacer so TimeSlider doesn't cover content */}
              <div className="h-16" />
            </section>

            <aside className="hidden md:flex w-[340px] lg:w-[380px] shrink-0 flex-col border-l border-white/[0.06] bg-[#070b10]">
              <div className="p-3 border-b border-white/[0.06]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Reference Map</div>
                <div className="relative h-[260px] rounded-lg overflow-hidden border border-white/[0.08]">
                  {mapView}
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 leading-snug">
                  Click a province or draw a polygon to drive the assessment.
                </p>
              </div>
              {selectedProvince && showDetail && (
                <div className="p-3 border-b border-white/[0.06]">
                  <ProvinceDetail
                    provinceId={selectedProvince}
                    year={year}
                    onClose={() => setShowDetail(false)}
                  />
                </div>
              )}
            </aside>
          </main>

          <div className="absolute bottom-0 left-0 right-0 z-10">
            <TimeSlider value={year} onChange={handleYearChange} />
          </div>
        </div>
      ) : (
        /* MAP VIEW — original sidebar + map layout */
        <div className="flex-1 flex overflow-hidden relative">
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside className={`
            fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
            w-[280px] shrink-0 glass-panel border-r border-white/[0.06]
            overflow-hidden transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            {renderTabContent('compact')}
          </aside>

          <main className="flex-1 relative overflow-hidden">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="absolute top-3 left-3 z-20 lg:hidden w-9 h-9 rounded-lg glass-panel flex items-center justify-center text-gray-400 hover:text-white border border-white/[0.08] transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            {mapView}

            {selectedProvince && showDetail && (
              <ProvinceDetail
                provinceId={selectedProvince}
                year={year}
                onClose={() => setShowDetail(false)}
              />
            )}

            <BasemapSwitcher value={mapState.basemap} onChange={mapState.setBasemap} />
            <Legend />
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <TimeSlider value={year} onChange={handleYearChange} />
            </div>
          </main>
        </div>
      )}

      <DataDisclaimer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-[#060a0e]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-3 animate-spin" />
          <p className="text-xs text-gray-500">Loading VinMap...</p>
        </div>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}
