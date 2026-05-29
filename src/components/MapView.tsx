'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, Popup, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import 'maplibre-gl/dist/maplibre-gl.css';
import { provinces } from '@/data/provinces';
import { interpolateYear } from '@/data/utils';
import { newsArticles } from '@/data/news-articles';
import { supplyRoutes, commodityColors } from '@/data/supply-chains';
import type { BasemapStyle } from './BasemapSwitcher';
import { BASEMAP_URLS, getSatelliteStyle } from './BasemapSwitcher';

interface FireHotspot {
  lat: number;
  lng: number;
  brightness: number;
  date: string;
  confidence: string;
  frp: number;
}

interface MapViewProps {
  year: number;
  showNews: boolean;
  showHeatmap: boolean;
  showProvinces: boolean;
  showFlows: boolean;
  basemap: BasemapStyle;
  drawingMode: boolean;
  drawPoints: [number, number][];
  onMapClick: (lng: number, lat: number) => void;
  onProvinceSelect: (id: string | null) => void;
  onNewsSelect: (id: string | null) => void;
}

// Vietnam bounding box for fallback filtering when boundary polygons are unavailable
const VN_BBOX = { minLng: 102.14, maxLng: 109.46, minLat: 8.18, maxLat: 23.39 };

function isPolygonFeature(
  feature: GeoJSON.Feature,
): feature is GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  return feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon';
}

export default function MapView({
  year,
  showNews,
  showHeatmap,
  showProvinces,
  showFlows,
  basemap,
  drawingMode,
  drawPoints,
  onMapClick,
  onProvinceSelect,
  onNewsSelect,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    lng: number;
    lat: number;
    name?: string;
    detail?: string;
  } | null>(null);

  // Province boundary GeoJSON from API
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<object | null>(null);
  const [fireHotspots, setFireHotspots] = useState<FireHotspot[]>([]);

  useEffect(() => {
    fetch('/api/boundaries')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.type === 'FeatureCollection') setBoundaryGeoJSON(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/fire-hotspots?days=5')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.hotspots)) setFireHotspots(data.hotspots);
      })
      .catch(() => {});
  }, []);

  const mapStyle = useMemo(() => {
    if (basemap === 'satellite') return getSatelliteStyle() as maplibregl.StyleSpecification;
    return BASEMAP_URLS[basemap];
  }, [basemap]);

  const provinceGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: provinces.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: {
        id: p.id,
        name: p.name,
        nameVi: p.nameVi,
        region: p.region,
        forestCover: interpolateYear(p.forestCover, year),
        forestLoss: interpolateYear(p.forestLoss, year),
        lossRate: interpolateYear(p.lossRate, year),
        primaryCrop: p.primaryCrop,
      },
    })),
  }), [year]);

  const vietnamBoundaryFeatures = useMemo(() => {
    if (!boundaryGeoJSON) return [];
    const featureCollection = boundaryGeoJSON as GeoJSON.FeatureCollection;
    return featureCollection.features.filter(isPolygonFeature);
  }, [boundaryGeoJSON]);

  const fireHotspotGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: fireHotspots.filter((p) => {
      // If boundary polygons loaded, clip precisely to Vietnam territory
      if (vietnamBoundaryFeatures.length > 0) {
        return vietnamBoundaryFeatures.some((feature) => (
          turf.booleanPointInPolygon(turf.point([p.lng, p.lat]), feature)
        ));
      }
      // Fallback: use Vietnam bounding box so the heatmap is never blank
      return (
        p.lng >= VN_BBOX.minLng && p.lng <= VN_BBOX.maxLng &&
        p.lat >= VN_BBOX.minLat && p.lat <= VN_BBOX.maxLat
      );
    }).map((p) => {
      const confidence = p.confidence.toLowerCase();
      const confidenceWeight =
        confidence === 'h' || confidence === 'high' ? 1 :
        confidence === 'n' || confidence === 'nominal' ? 0.75 :
        confidence === 'l' || confidence === 'low' ? 0.5 :
        Math.min(1, Math.max(0.35, Number(p.confidence) / 100 || 0.65));
      const frpWeight = Math.min(1, Math.max(0.25, p.frp / 35));
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          intensity: Math.max(0.2, confidenceWeight * frpWeight),
          date: p.date,
          frp: p.frp,
          confidence: p.confidence,
        },
      };
    }),
  }), [fireHotspots, vietnamBoundaryFeatures]);

  const newsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: newsArticles
      .filter((a) => new Date(a.date).getFullYear() <= year)
      .map((a) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] },
        properties: { id: a.id, title: a.title, source: a.source, category: a.category },
      })),
  }), [year]);

  // Supply chain flow lines
  const flowGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: supplyRoutes.map((route, i) => {
      // Create curved line via midpoint offset
      const midLng = (route.from[0] + route.to[0]) / 2;
      const midLat = (route.from[1] + route.to[1]) / 2;
      const dx = route.to[0] - route.from[0];
      const dy = route.to[1] - route.from[1];
      const offsetLng = midLng + dy * 0.15;
      const offsetLat = midLat - dx * 0.15;
      // Approximate bezier with 5 points
      const points: [number, number][] = [];
      for (let t = 0; t <= 1; t += 0.2) {
        const u = 1 - t;
        const lng = u * u * route.from[0] + 2 * u * t * offsetLng + t * t * route.to[0];
        const lat = u * u * route.from[1] + 2 * u * t * offsetLat + t * t * route.to[1];
        points.push([lng, lat]);
      }
      return {
        type: 'Feature' as const,
        geometry: { type: 'LineString' as const, coordinates: points },
        properties: {
          commodity: route.commodity,
          province: route.province,
          color: commodityColors[route.commodity] || '#ffffff',
          index: i,
        },
      };
    }),
  }), []);

  // Port markers
  const portGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: [
      { name: 'HCM Port', lng: 106.74, lat: 10.76 },
      { name: 'Hai Phong Port', lng: 106.72, lat: 20.86 },
      { name: 'Da Nang Port', lng: 108.22, lat: 16.07 },
    ].map((port) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [port.lng, port.lat] },
      properties: { name: port.name },
    })),
  }), []);

  const drawPolygonGeoJSON = useMemo((): GeoJSON.Feature | null => {
    if (drawPoints.length < 2) return null;
    const coords = [...drawPoints];
    if (drawPoints.length >= 3) {
      coords.push(drawPoints[0]);
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coords] },
        properties: {},
      };
    }
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: {},
    };
  }, [drawPoints]);

  const drawPointsGeoJSON = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: drawPoints.map((p, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: p },
      properties: { index: i },
    })),
  }), [drawPoints]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (drawingMode) {
        onMapClick(e.lngLat.lng, e.lngLat.lat);
        return;
      }
      try {
        const newsFeatures = e.target.queryRenderedFeatures(e.point, { layers: ['news-markers'] });
        if (newsFeatures.length > 0) {
          onNewsSelect(newsFeatures[0].properties?.id ?? null);
          return;
        }
        const provFeatures = e.target.queryRenderedFeatures(e.point, { layers: ['province-circles'] });
        if (provFeatures.length > 0) {
          const pid = provFeatures[0].properties?.id ?? null;
          onProvinceSelect(pid);
          const prov = provinces.find((p) => p.id === pid);
          if (prov && mapRef.current) {
            mapRef.current.flyTo({ center: [prov.lng, prov.lat], zoom: 8, duration: 1200 });
          }
          return;
        }
      } catch { /* layers not yet loaded */ }

      onProvinceSelect(null);
      onNewsSelect(null);
    },
    [drawingMode, onMapClick, onProvinceSelect, onNewsSelect],
  );

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      try {
        const features = e.target.queryRenderedFeatures(e.point, {
          layers: ['province-circles', 'news-markers'],
        });
        if (features.length > 0) {
          const f = features[0];
          setHoverInfo({
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            name: f.properties?.name || f.properties?.title,
            detail: f.properties?.nameVi || f.properties?.region || f.properties?.source,
          });
          e.target.getCanvas().style.cursor = 'pointer';
        } else {
          setHoverInfo(null);
          e.target.getCanvas().style.cursor = drawingMode ? 'crosshair' : '';
        }
      } catch {
        setHoverInfo(null);
      }
    },
    [drawingMode],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 106.5, latitude: 15.5, zoom: 5.8 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      maxBounds={[
        [98, 5],
        [115, 26],
      ]}
    >
      <NavigationControl position="top-right" showCompass={false} />

      {/* Province boundary polygons from real GeoJSON */}
      {showProvinces && boundaryGeoJSON && (
        <Source id="boundaries" type="geojson" data={boundaryGeoJSON as GeoJSON.FeatureCollection}>
          <Layer
            id="boundary-fill"
            type="fill"
            paint={{
              'fill-color': '#00dc82',
              'fill-opacity': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.04,
                6, 0.07,
                8, 0.1,
              ],
            }}
          />
          <Layer
            id="boundary-line"
            type="line"
            paint={{
              'line-color': '#00dc82',
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.5,
                6, 1,
                8, 1.5,
              ],
              'line-opacity': 0.35,
            }}
          />
          <Layer
            id="boundary-labels"
            type="symbol"
            minzoom={6}
            layout={{
              'text-field': ['get', 'name'],
              'text-size': [
                'interpolate', ['linear'], ['zoom'],
                6, 9,
                8, 12,
              ],
              'text-allow-overlap': false,
              'text-ignore-placement': false,
            }}
            paint={{
              'text-color': 'rgba(255,255,255,0.5)',
              'text-halo-color': '#000',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}

      {showHeatmap && (
        <Source id="heatmap" type="geojson" data={fireHotspotGeoJSON}>
          <Layer
            id="fire-hotspot-heat"
            type="heatmap"
            paint={{
              'heatmap-weight': ['get', 'intensity'],
              'heatmap-intensity': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.3,
                6, 0.5,
                8, 0.7,
                10, 0.9,
              ],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(0,0,0,0)',
                0.15, 'rgba(255,160,0,0.15)',
                0.35, 'rgba(255,100,0,0.30)',
                0.55, 'rgba(255,50,0,0.42)',
                0.75, 'rgba(230,20,0,0.55)',
                1, 'rgba(180,0,0,0.7)',
              ],
              'heatmap-radius': [
                'interpolate', ['linear'], ['zoom'],
                4, 8,
                6, 12,
                8, 16,
                10, 20,
              ],
              'heatmap-opacity': [
                'interpolate', ['linear'], ['zoom'],
                4, 0.4,
                6, 0.5,
                9, 0.55,
              ],
            }}
          />
        </Source>
      )}

      {/* Supply chain flow lines */}
      {showFlows && (
        <>
          <Source id="flows" type="geojson" data={flowGeoJSON}>
            <Layer
              id="flow-lines-glow"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 4,
                'line-opacity': 0.15,
                'line-blur': 3,
              }}
            />
            <Layer
              id="flow-lines"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 1.5,
                'line-opacity': 0.6,
                'line-dasharray': [2, 2],
              }}
            />
          </Source>
          <Source id="ports" type="geojson" data={portGeoJSON}>
            <Layer
              id="port-glow"
              type="circle"
              paint={{
                'circle-radius': 12,
                'circle-color': '#ffffff',
                'circle-opacity': 0.08,
              }}
            />
            <Layer
              id="port-markers"
              type="circle"
              paint={{
                'circle-radius': 5,
                'circle-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#00dc82',
                'circle-opacity': 0.9,
              }}
            />
            <Layer
              id="port-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-size': 10,
                'text-offset': [0, 1.5],
                'text-anchor': 'top',
              }}
              paint={{
                'text-color': '#fff',
                'text-halo-color': '#000',
                'text-halo-width': 1,
              }}
            />
          </Source>
        </>
      )}

      {showProvinces && (
        <Source id="provinces" type="geojson" data={provinceGeoJSON}>
          <Layer
            id="province-circles"
            type="circle"
            paint={{
              'circle-radius': [
                'interpolate', ['linear'], ['get', 'forestCover'],
                5000, 4,
                100000, 10,
                500000, 18,
                900000, 26,
              ],
              'circle-color': [
                'interpolate', ['linear'], ['get', 'lossRate'],
                0, '#00dc82',
                0.005, '#66bb6a',
                0.01, '#fdd835',
                0.02, '#ff9800',
                0.03, '#f44336',
              ],
              'circle-opacity': 0.75,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': 'rgba(255,255,255,0.25)',
            }}
          />
          <Layer
            id="province-labels"
            type="symbol"
            minzoom={7}
            layout={{
              'text-field': [
                'format',
                ['get', 'name'], { 'font-scale': 1.0 },
                '\n', {},
                ['get', 'nameVi'], { 'font-scale': 0.8 },
              ],
              'text-size': 11,
              'text-offset': [0, 2.0],
              'text-anchor': 'top',
            }}
            paint={{
              'text-color': '#ccc',
              'text-halo-color': '#000',
              'text-halo-width': 1,
            }}
          />
        </Source>
      )}

      {showNews && (
        <Source id="news" type="geojson" data={newsGeoJSON}>
          <Layer
            id="news-glow"
            type="circle"
            paint={{
              'circle-radius': 14,
              'circle-color': '#00dc82',
              'circle-opacity': 0.12,
            }}
          />
          <Layer
            id="news-markers"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': [
                'match', ['get', 'category'],
                'eudr', '#ff6b6b',
                'deforestation', '#ffa726',
                'policy', '#42a5f5',
                'climate', '#66bb6a',
                'agriculture', '#e8d44d',
                '#ffffff',
              ],
              'circle-opacity': 0.95,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>
      )}

      {drawPolygonGeoJSON && (
        <Source id="draw-polygon" type="geojson" data={drawPolygonGeoJSON}>
          {drawPoints.length >= 3 && (
            <Layer
              id="draw-fill"
              type="fill"
              paint={{ 'fill-color': '#00dc82', 'fill-opacity': 0.12 }}
            />
          )}
          <Layer
            id="draw-line"
            type="line"
            paint={{
              'line-color': '#00dc82',
              'line-width': 2,
              'line-dasharray': [3, 2],
            }}
          />
        </Source>
      )}

      {drawPoints.length > 0 && (
        <Source id="draw-points" type="geojson" data={drawPointsGeoJSON}>
          <Layer
            id="draw-vertices"
            type="circle"
            paint={{
              'circle-radius': 5,
              'circle-color': '#00dc82',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            }}
          />
        </Source>
      )}

      {hoverInfo && (
        <Popup
          longitude={hoverInfo.lng}
          latitude={hoverInfo.lat}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
          offset={12}
        >
          <div className="text-xs text-black">
            <div className="font-semibold">{hoverInfo.name}</div>
            {hoverInfo.detail && <div className="text-gray-600">{hoverInfo.detail}</div>}
          </div>
        </Popup>
      )}
    </Map>
  );
}
