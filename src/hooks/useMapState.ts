'use client';

import { useState, useCallback } from 'react';
import type { BasemapStyle } from '@/components/BasemapSwitcher';

export function useMapState() {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showProvinces, setShowProvinces] = useState(true);
  const [showNews, setShowNews] = useState(true);
  const [showFlows, setShowFlows] = useState(false);
  const [basemap, setBasemap] = useState<BasemapStyle>('dark');

  const toggleHeatmap = useCallback(() => setShowHeatmap((p) => !p), []);
  const toggleProvinces = useCallback(() => setShowProvinces((p) => !p), []);
  const toggleNews = useCallback(() => setShowNews((p) => !p), []);
  const toggleFlows = useCallback(() => setShowFlows((p) => !p), []);

  return {
    showHeatmap,
    showProvinces,
    showNews,
    showFlows,
    basemap,
    setBasemap,
    toggleHeatmap,
    toggleProvinces,
    toggleNews,
    toggleFlows,
  };
}
