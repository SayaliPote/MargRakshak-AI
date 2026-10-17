import React, { useState, useEffect, useCallback } from 'react';
import MapView from '../../components/MapView';
import RiskBadge from '../../components/common/RiskBadge';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { 
  Calendar, 
  Cpu, 
  Layers, 
  Info, 
  Filter, 
  MapPin, 
  SlidersHorizontal,
  Navigation,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Flame,
  RefreshCw,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { initIndexedDB } from '../../utils/indexedDB';
import { useLanguage } from '../../context/LanguageContext';
import { getHotspots, getHotspotsGeoJSON } from '../../services/api';
import { getFallbackHotspots, normalizeHotspot } from '../../data/hotspots';

export default function AdminMap() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState('2026-07-01 to 2026-08-25');
  const [selectedAlgo, setSelectedAlgo] = useState('ALL');
  
  // Map layers states
  const [showPins, setShowPins] = useState(true);
  const [showKde, setShowKde] = useState(true);
  const [showSpeedLimits, setShowSpeedLimits] = useState(false);

  // Data & Backend states
  const [allHotspots, setAllHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isFallbackHotspots, setIsFallbackHotspots] = useState(false);

  /**
   * Helper to parse GeoJSON FeatureCollection into normalized hotspot objects
   * expected by MapView and the right-side detail drawer.
   */
  const parseGeoJSONFeatures = (featureCollection) => {
    if (!featureCollection || !Array.isArray(featureCollection.features)) {
      return [];
    }

    return featureCollection.features.map((feature, idx) => {
      // GeoJSON standard RFC 7946 coordinates order: [longitude, latitude]
      const coords = feature.geometry?.coordinates || [73.7898, 19.9975];
      const lng = parseFloat(coords[0]);
      let lat = parseFloat(coords[1]);
      if (lat > 9 && lat < 11) lat = lat + 10;
      const p = feature.properties || {};

      return {
        id: p.id || `hotspot-${idx}`,
        name: p.name || 'Unnamed Hotspot',
        lat: isNaN(lat) ? 19.9975 : lat,
        lng: isNaN(lng) ? 73.7898 : lng,
        riskLevel: (p.riskLevel || p.risk_level || 'MEDIUM').toUpperCase(),
        riskScore: typeof p.riskScore === 'number' 
          ? p.riskScore 
          : (typeof p.risk_score === 'number' ? p.risk_score : 0.5),
        accidentCount: p.accidentCount ?? p.accident_count ?? 0,
        density: p.density ?? 0,
        radius: p.radius ?? p.radius_meters ?? 200,
        speedLimit: p.speedLimit ?? p.speed_limit ?? 40,
        algorithm: p.algorithm || 'HDBSCAN',
        riskFactors: Array.isArray(p.riskFactors) 
          ? p.riskFactors 
          : (Array.isArray(p.risk_factors) ? p.risk_factors : []),
        safetyRecommendation: p.safetyRecommendation || p.safety_recommendation || '',
        lastUpdated: p.lastUpdated || p.last_updated || 'Recent',
        rawFeature: feature,
        ...p,
      };
    });
  };

  /**
   * Fetch complete hotspots list from GET /api/v1/hotspots (limit: 200)
   * with automatic fallback to GeoJSON and offline dataset.
   */
  const fetchMapData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      let parsed = [];

      // Primary attempt: GET /api/v1/hotspots?limit=200 to fetch all real seeded records
      try {
        const resp = await getHotspots({ limit: 200 });
        const items = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        if (items.length > 0) {
          parsed = items.map(normalizeHotspot);
        }
      } catch (apiErr) {
        console.warn('getHotspots API call failed, trying GeoJSON endpoint:', apiErr);
      }

      // Secondary attempt: GET /api/v1/hotspots/geojson?limit=1000 if items empty
      if (parsed.length === 0) {
        try {
          const geojsonData = await getHotspotsGeoJSON({ limit: 1000 });
          parsed = parseGeoJSONFeatures(geojsonData);
        } catch (geoErr) {
          console.warn('getHotspotsGeoJSON call also failed:', geoErr);
        }
      }

      if (parsed.length > 0) {
        setAllHotspots(parsed);
        setIsFallbackHotspots(false);
      } else {
        const fallbackList = getFallbackHotspots();
        setAllHotspots(fallbackList);
        setIsFallbackHotspots(true);
      }

      const activeList = parsed.length > 0 ? parsed : getFallbackHotspots();
      if (activeList.length > 0) {
        setSelectedHotspot((prev) => {
          if (prev) {
            const match = activeList.find(h => h.id === prev.id);
            if (match) return match;
          }
          const topSpot = activeList.find(h => !(h.name || '').toLowerCase().includes('test'));
          return topSpot || activeList[0];
        });
      }

      // Sync offline IndexedDB cache with data
      if (activeList.length > 0) {
        initIndexedDB(activeList)
          .catch(err => console.error('IndexedDB sync error in Admin Map:', err));
      }
    } catch (err) {
      console.warn('Backend hotspots unreachable in AdminMap, using fallback mock dataset:', err);
      const fallbackList = getFallbackHotspots();
      setAllHotspots(fallbackList);
      setIsFallbackHotspots(true);

      if (fallbackList.length > 0) {
        setSelectedHotspot((prev) => {
          if (prev) {
            const match = fallbackList.find(h => h.id === prev.id);
            if (match) return match;
          }
          const topSpot = fallbackList.find(h => !(h.name || '').toLowerCase().includes('test'));
          return topSpot || fallbackList[0];
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch real hotspots on mount
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Dynamically filter hotspots when algorithm selector or data changes
  const hotspotsList = React.useMemo(() => {
    if (!selectedAlgo || selectedAlgo === 'ALL') {
      return allHotspots;
    }
    return allHotspots.filter(
      h => (h.algorithm || 'HDBSCAN').toUpperCase() === selectedAlgo.toUpperCase()
    );
  }, [selectedAlgo, allHotspots]);

  const handleSelectHotspot = (hotspot) => {
    setSelectedHotspot(hotspot);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-gray-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {t('admin.map.title')}
            </h1>
            <Badge variant="neutral" size="sm" dot>
              {t('admin.map.badge')}
            </Badge>
            {allHotspots.length > 0 && (
              <Badge variant={isFallbackHotspots ? "warning" : "success"} size="sm">
                {allHotspots.length} {isFallbackHotspots ? 'Offline Zones' : 'Live Zones'}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t('admin.map.subtitle')}
          </p>
        </div>

        {/* Layer Toggle Chips & Refresh Action */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPins(!showPins)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              showPins
                ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm'
                : 'bg-white dark:bg-[#151821] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>{t('admin.map.layerPins')}</span>
          </button>

          <button
            onClick={() => setShowKde(!showKde)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              showKde
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white dark:bg-[#151821] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('admin.map.layerKde')}</span>
          </button>

          <button
            onClick={() => setShowSpeedLimits(!showSpeedLimits)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              showSpeedLimits
                ? 'bg-red-600 text-white border-red-600 shadow-sm'
                : 'bg-white dark:bg-[#151821] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('admin.map.layerSpeed')}</span>
          </button>

          <Button
            variant="secondary"
            size="xs"
            pill
            icon={RefreshCw}
            onClick={fetchMapData}
            disabled={isLoading}
            className="ml-1"
          >
            {isLoading ? 'Fetching...' : 'Sync'}
          </Button>
        </div>
      </div>

      {/* Loading Banner */}
      {isLoading && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Synchronizing live accident hotspots with GIS map layer...</span>
        </div>
      )}

      {/* Fallback Notice Badge with Retry */}
      {isFallbackHotspots && (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 w-fit">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Showing sample hotspot data — backend offline</span>
          </div>
          <button
            type="button"
            onClick={fetchMapData}
            className="flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline cursor-pointer ml-3 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}



      {/* Filter Controls Card */}
      <Card padding="p-4" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('admin.map.dateRangeLabel')}
            </label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="mt-0.5 block w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            >
              <option value="2026-07-01 to 2026-08-25">{t('admin.map.dateRangeLast60')}</option>
              <option value="2026-01-01 to 2026-08-25">{t('admin.map.dateRangeYtd')}</option>
              <option value="2025-01-01 to 2025-12-31">{t('admin.map.dateRangeFullYear')}</option>
            </select>
          </div>
        </div>

        {/* Algorithm Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('admin.map.algoLabel')}
            </label>
            <select 
              value={selectedAlgo} 
              onChange={(e) => setSelectedAlgo(e.target.value)}
              className="mt-0.5 block w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            >
              <option value="ALL">All Algorithms</option>
              <option value="HDBSCAN">{t('admin.map.algoHdbscan')}</option>
              <option value="DBSCAN">{t('admin.map.algoDbscan')}</option>
              <option value="K-Means">{t('admin.map.algoKmeans')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Map & Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Map Container with Floating Legend & Loading Overlay */}
        <div className="lg:col-span-3 h-[380px] sm:h-[500px] lg:h-[600px] flex flex-col relative rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-800/80 shadow-card">
          <MapView 
            hotspots={hotspotsList}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={handleSelectHotspot}
            showPins={showPins}
            showKde={showKde}
            showSpeedLimits={showSpeedLimits}
            zoom={13}
          />

          {/* Loading Indicator Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-[600] bg-white/70 dark:bg-[#111319]/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Loading live GIS hotspots GeoJSON...
              </p>
            </div>
          )}

          {/* Floating Risk Level Legend Card matching user mockup */}
          <div className="absolute bottom-4 left-4 z-[500] p-3.5 rounded-2xl bg-white/95 dark:bg-[#111319]/95 backdrop-blur-md border border-gray-200/90 dark:border-gray-800/90 shadow-elevated max-w-xs pointer-events-auto text-xs">
            <div className="font-bold text-gray-900 dark:text-white text-xs mb-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
              <span>{t('admin.map.legendTitle')}</span>
              <span className="text-[10px] text-gray-400 font-mono">Nashik GIS</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{t('admin.map.legendHigh')}</span>
                <span className="text-gray-400 text-[11px] ml-auto">{t('admin.map.legendHighDesc')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{t('admin.map.legendMedium')}</span>
                <span className="text-gray-400 text-[11px] ml-auto">{t('admin.map.legendMediumDesc')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{t('admin.map.legendLow')}</span>
                <span className="text-gray-400 text-[11px] ml-auto">{t('admin.map.legendLowDesc')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Selected Zone Info Card */}
        <div className="lg:col-span-1 space-y-4">
          <Card padding="p-5" className="h-full flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-600" /> {t('admin.map.zoneDetails')}
                </h3>
                {selectedHotspot && (
                  <RiskBadge level={selectedHotspot.riskLevel} size="sm" />
                )}
              </div>
              
              {selectedHotspot ? (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block">
                      {t('admin.map.zoneIdentifier')}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5 leading-snug">
                      {selectedHotspot.name}
                    </h4>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#151821] border border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.map.riskScore')}</span>
                      <span className="text-xl font-black text-gray-900 dark:text-white">{selectedHotspot.riskScore}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.map.accidents')}</span>
                      <span className="text-xl font-black text-red-600 dark:text-red-400">{selectedHotspot.accidentCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.map.densityPerKm')}</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedHotspot.density}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold block">{t('admin.map.algorithm')}</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedHotspot.algorithm}</span>
                    </div>
                  </div>

                  {/* Detected Risk Factors */}
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-2">
                      {t('admin.map.riskFactors')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedHotspot.riskFactors || []).map((factor, idx) => (
                        <span 
                          key={idx}
                          className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200/80 dark:border-gray-700/80"
                        >
                          {factor}
                        </span>
                      ))}
                      {(!selectedHotspot.riskFactors || selectedHotspot.riskFactors.length === 0) && (
                        <span className="text-xs text-gray-400 italic">None reported</span>
                      )}
                    </div>
                  </div>

                  {/* GPS Coordinates */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#151821] border border-gray-100 dark:border-gray-800 text-xs font-mono space-y-1 text-gray-500 dark:text-gray-400">
                    <div>{t('admin.map.latitude')}: <span className="text-gray-900 dark:text-white font-bold">{typeof selectedHotspot.lat === 'number' ? selectedHotspot.lat.toFixed(5) : selectedHotspot.lat}</span></div>
                    <div>{t('admin.map.longitude')}: <span className="text-gray-900 dark:text-white font-bold">{typeof selectedHotspot.lng === 'number' ? selectedHotspot.lng.toFixed(5) : selectedHotspot.lng}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 mx-auto flex items-center justify-center text-gray-400">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('admin.map.emptyTitle')}</h5>
                  <p className="text-xs leading-relaxed max-w-[200px] mx-auto">
                    {t('admin.map.emptyDesc')}
                  </p>
                </div>
              )}
            </div>

            {selectedHotspot && (
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400 text-center">
                {t('admin.map.lastAudit')}: {selectedHotspot.lastUpdated}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
