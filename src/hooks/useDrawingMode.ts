'use client';

import { useState, useCallback } from 'react';

export function useDrawingMode(setActiveTab: (tab: 'stats' | 'news' | 'assess' | 'ai') => void) {
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);

  const handleMapClick = useCallback((lng: number, lat: number) => {
    setDrawPoints((prev) => [...prev, [lng, lat]]);
  }, []);

  const handleStartDraw = useCallback(() => {
    setDrawPoints([]);
    setDrawingMode(true);
    setActiveTab('assess');
  }, [setActiveTab]);

  const handleClearDraw = useCallback(() => {
    setDrawPoints([]);
    setDrawingMode(false);
  }, []);

  return {
    drawingMode,
    setDrawingMode,
    drawPoints,
    handleMapClick,
    handleStartDraw,
    handleClearDraw,
  };
}
