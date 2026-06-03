'use client';

import { useState, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import StatsPanel from '@/components/StatsPanel';
import NewsPanel from '@/components/NewsPanel';
import IntelligenceDashboard from '@/components/intel/IntelligenceDashboard';
import TimeSlider from '@/components/TimeSlider';
import Legend from '@/components/Legend';
import HeadlineStrip from '@/components/HeadlineStrip';
import AlertTicker from '@/components/AlertTicker';
import ProvinceDetail from '@/components/ProvinceDetail';
import BasemapSwitcher from '@/components/BasemapSwitcher';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DataDisclaimer } from '@/components/DataSourceBadge';
import { Menu, BarChart3, Newspaper, Target, Sparkles } from 'lucide-react';
import MidoriAvatar from '@/components/midori/MidoriAvatar';
import { useMapState } from '@/hooks/useMapState';
import { useDrawingMode } from '@/hooks/useDrawingMode';
import { useNews } from '@/hooks/useNews';
import { useURLState, useInitialURLState, type ViewMode } from '@/hooks/useURLState';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#faf8f3]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-3 animate-spin" />
        <p className="text-xs text-[#6b7280]">Loading map...</p>
      </div>
    </div>
  ),
});

const LandAssessmentPanel = dynamic(() => import('@/components/assessment/LandAssessmentPanel'), {
  loading: () => (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-2 animate-spin" />
        <p className="text-xs text-[#6b7280]">Loading assessment...</p>
      </div>
    </div>
  ),
});

type Tab = 'stats' | 'news' | 'assess' | 'intelligence';

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
  const [pendingMidoriQuery, setPendingMidoriQuery] = useState<string | null>(null);
  const [assessMidoriQuery, setAssessMidoriQuery] = useState<string | null>(null);

  const handleAssessmentReady = useCallback((query: string | null) => {
    setAssessMidoriQuery(query);
  }, []);

  const mapState = useMapState();
  const { articles: liveNews } = useNews();
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

  const handleAskMidori = useCallback((query: string) => {
    setPendingMidoriQuery(query);
    setActiveTab('intelligence');
  }, []);

  const isIntel = viewMode === 'intel';
  const isIntelligence = activeTab === 'intelligence';

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
            onAssessmentReady={handleAssessmentReady}
          />
        );
    }
  };

  // Mobile-only tab switcher. The header tab nav is hidden below sm, so this is
  // the only way to change tabs on a phone. Reused by both Map and Intel views.
  const mobileTabBar = (
    <div className="sm:hidden flex items-center gap-1 p-2 border-b border-[#35b779]/[0.15] shrink-0 bg-[#faf8f3]/95 backdrop-blur-sm">
      {([
        { id: 'stats' as Tab, label: 'Stats', icon: BarChart3 },
        { id: 'news' as Tab, label: 'News', icon: Newspaper },
        { id: 'assess' as Tab, label: 'Assess', icon: Target },
        { id: 'intelligence' as Tab, label: 'Midori', icon: Sparkles },
      ]).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => handleTabChange(id)}
          aria-pressed={activeTab === id}
          className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            activeTab === id
              ? 'bg-accent/15 text-accent'
              : 'text-[#374151] hover:text-[#111827] hover:bg-[#35b779]/8'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );

  const mapView = (
    <ErrorBoundary fallbackTitle="Map failed to load">
      <MapView
        year={year}
        showNews={mapState.showNews}
        showHeatmap={mapState.showHeatmap}
        showProvinces={mapState.showProvinces}
        showFlows={mapState.showFlows}
        showLoss={mapState.showLoss}
        basemap={mapState.basemap}
        drawingMode={drawingMode}
        drawPoints={drawPoints}
        onMapClick={handleMapClick}
        onProvinceSelect={handleProvinceSelect}
        onNewsSelect={(id) => {
          setSelectedNewsId(id);
          if (id) setActiveTab('news');
        }}
        newsArticles={liveNews}
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
        showLoss={mapState.showLoss}
        onToggleHeatmap={mapState.toggleHeatmap}
        onToggleProvinces={mapState.toggleProvinces}
        onToggleNews={mapState.toggleNews}
        onToggleFlows={mapState.toggleFlows}
        onToggleLoss={mapState.toggleLoss}
        onProvinceSearch={handleProvinceSearch}
        year={year}
        selectedProvince={selectedProvince}
      />

      {!isIntelligence && (
        <>
          <div className="hidden md:block">
            <HeadlineStrip year={year} />
          </div>
          <AlertTicker year={year} />
        </>
      )}

      {isIntelligence ? (
        /* VINMAP INTELLIGENCE — full-screen dashboard, map chrome hidden */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="sm:hidden shrink-0">{mobileTabBar}</div>
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary fallbackTitle="Intelligence dashboard failed">
              <IntelligenceDashboard
                year={year}
                selectedProvince={selectedProvince}
                pendingQuery={pendingMidoriQuery}
                onQueryConsumed={() => setPendingMidoriQuery(null)}
              />
            </ErrorBoundary>
          </div>
        </div>
      ) : isIntel ? (
        /* INTEL VIEW — intel canvas dominant, map shrunk to right-side inset */
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 flex overflow-hidden">
            <section className="flex-1 overflow-y-auto bg-background">
              <div className="sm:hidden sticky top-0 z-10">{mobileTabBar}</div>
              {renderTabContent('wide')}
              {/* Bottom spacer so TimeSlider doesn't cover content */}
              <div className="h-16" />
            </section>

            <aside className="hidden md:flex w-[340px] lg:w-[380px] shrink-0 flex-col border-l border-[#35b779]/[0.15] bg-[#f5f0e8]">
              <div className="p-3 border-b border-[#35b779]/[0.15]">
                <div className="text-[10px] text-[#6b7280] uppercase tracking-wider mb-1.5">Reference Map</div>
                <div className="relative h-[260px] rounded-lg overflow-hidden border border-[#35b779]/[0.20]">
                  {mapView}
                </div>
                <p className="text-[10px] text-[#6b7280] mt-1.5 leading-snug">
                  Click a province or draw a polygon to drive the assessment.
                </p>
              </div>
              {selectedProvince && showDetail && (
                <div className="p-3 border-b border-[#35b779]/[0.15]">
                  <ProvinceDetail
                    provinceId={selectedProvince}
                    year={year}
                    onClose={() => setShowDetail(false)}
                    onAskMidori={handleAskMidori}
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
              className="fixed inset-0 bg-[#111827]/20 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside className={`
            fixed lg:relative inset-y-0 left-0 z-40 lg:z-auto
            w-[280px] shrink-0 glass-panel border-r border-[#35b779]/[0.15]
            overflow-hidden transition-transform duration-300 ease-in-out
            flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            {mobileTabBar}
            <div className="flex-1 overflow-hidden">
              {renderTabContent('compact')}
            </div>
          </aside>

          <main className="flex-1 relative overflow-hidden">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="absolute top-3 left-3 z-20 lg:hidden w-11 h-11 rounded-lg glass-panel flex items-center justify-center text-[#374151] hover:text-[#111827] border border-[#35b779]/[0.20] transition-colors"
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
                onAskMidori={handleAskMidori}
              />
            )}

            {/* Floating "Research with Midori" bubble — shown when an assessment is loaded */}
            {activeTab === 'assess' && assessMidoriQuery && (
              <div className="fixed top-[210px] left-[340px] lg:left-[430px] z-50 flex items-end gap-2 animate-fade-in">
                <div className="bg-white/95 backdrop-blur-sm border border-[#35b779]/30 shadow-xl rounded-2xl rounded-bl-none px-3 py-2.5">
                  <p className="text-[11px] font-bold text-[#111827] leading-tight">Research with Midori</p>
                  <p className="text-[10px] text-[#35b779] font-semibold leading-tight">Full analysis of this plot</p>
                </div>
                <button
                  onClick={() => handleAskMidori(assessMidoriQuery)}
                  className="shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-xl ring-2 ring-[#35b779]/40 hover:ring-[#35b779]/70 hover:scale-110 transition-all"
                  aria-label="Research this assessment with Midori"
                >
                  <MidoriAvatar size="md" gem />
                </button>
              </div>
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
      <div className="h-screen w-screen flex items-center justify-center bg-[#faf8f3]">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-accent/30 border-t-accent mx-auto mb-3 animate-spin" />
          <p className="text-xs text-[#6b7280]">Loading VinMap...</p>
        </div>
      </div>
    }>
      <Dashboard />
    </Suspense>
  );
}
