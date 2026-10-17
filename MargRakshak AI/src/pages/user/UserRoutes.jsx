import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MapView from '../../components/MapView';
import { getHotspots } from '../../services/api';
import { findHotspotsNearRoute } from '../../utils/distance';
import { geocodePlace, fetchRoadRoutes } from '../../utils/geocode';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getFallbackHotspots, normalizeHotspot } from '../../data/hotspots';
import RiskBadge from '../../components/common/RiskBadge';
import NotificationToast from '../../components/common/NotificationToast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  Compass, 
  ShieldCheck, 
  Navigation, 
  AlertTriangle, 
  AlertCircle,
  ArrowRight, 
  Loader2, 
  RotateCcw,
  Search,
  MapPin,
  LocateFixed,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function UserRoutes() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { t } = useLanguage();
  const { location: userLoc } = useGeolocation(true);

  // Initial destination passed via router state or empty by default
  const initialDestination = useMemo(() => {
    return (
      routerLocation.state?.destinationCoords ||
      routerLocation.state?.destination ||
      routerLocation.state?.destinationQuery ||
      ''
    );
  }, [routerLocation.state]);

  const [destination, setDestination] = useState(initialDestination);
  const [destinationQuery, setDestinationQuery] = useState(() => {
    if (typeof initialDestination === 'string') return initialDestination;
    return initialDestination?.displayName || '';
  });

  // Intermediate stops / waypoints state (up to 5 intermediate stops)
  // Each waypoint item: { id, query, coords: { lat, lng, displayName } | null }
  const [waypoints, setWaypoints] = useState(() => {
    if (Array.isArray(routerLocation.state?.waypoints) && routerLocation.state.waypoints.length > 0) {
      return routerLocation.state.waypoints.map((wp, idx) => ({
        id: wp.id || `wp_${idx}_${Date.now()}`,
        query: wp.label || wp.displayName || '',
        coords: wp.lat && wp.lng ? { lat: wp.lat, lng: wp.lng, displayName: wp.label } : null,
      }));
    }
    return [];
  });

  const [resolvedWaypointsList, setResolvedWaypointsList] = useState([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Backend hotspots state with granular live / fallback / loading / error indicators
  const [hotspots, setHotspots] = useState([]);
  const [isHotspotsLoading, setIsHotspotsLoading] = useState(true);
  const [isFallbackHotspots, setIsFallbackHotspots] = useState(false);
  const [hotspotsError, setHotspotsError] = useState(null);

  // Dynamic OSRM routes state
  const [rawRoutes, setRawRoutes] = useState([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  // Route preference filter ('all' | 'safest' | 'fastest')
  const [routePreference, setRoutePreference] = useState('all');

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Keep a stable ref to userLoc to avoid triggering route refetches on micro GPS jitter
  const userLocRef = useRef(userLoc);
  useEffect(() => {
    userLocRef.current = userLoc;
  }, [userLoc]);

  // Fetch real hotspots from backend with fallback to mock data
  const fetchHotspots = useCallback(async () => {
    setIsHotspotsLoading(true);
    setHotspotsError(null);
    try {
      const data = await getHotspots({ limit: 200 });
      const items = Array.isArray(data) ? data : (data?.items || []);
      if (items.length > 0) {
        setHotspots(items.map(normalizeHotspot));
        setIsFallbackHotspots(false);
        setHotspotsError(null);
      } else {
        console.warn('Backend returned 0 hotspots, falling back to verified dataset');
        setHotspots(getFallbackHotspots());
        setIsFallbackHotspots(true);
      }
    } catch (err) {
      console.warn('Backend hotspots unreachable in UserRoutes, using fallback mock dataset:', err);
      setHotspots(getFallbackHotspots());
      setIsFallbackHotspots(true);
      setHotspotsError(err.message || 'API connection failed');
    } finally {
      setIsHotspotsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotspots();
  }, [fetchHotspots]);

  // Waypoint controls
  const handleAddWaypoint = () => {
    if (waypoints.length >= 5) {
      setToastType('error');
      setToastMessage('Maximum 5 intermediate stops allowed.');
      return;
    }
    const newId = `wp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setWaypoints((prev) => [...prev, { id: newId, query: '', coords: null }]);
  };

  const handleRemoveWaypoint = (id) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    setReloadTrigger((v) => v + 1);
  };

  const handleMoveWaypoint = (index, direction) => {
    setWaypoints((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setReloadTrigger((v) => v + 1);
  };

  const handleWaypointQueryChange = (id, newQuery) => {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, query: newQuery, coords: null } : w))
    );
  };

  // Fetch dynamic road-following routes from OSRM on mount or when destination/stops change
  useEffect(() => {
    let isCancelled = false;

    async function loadRoadRoutes() {
      if (!destination) return;
      setIsRoutingLoading(true);
      setRouteError(null);

      try {
        let destCoords = null;

        // Determine destination coordinates: direct object or geocoded query
        if (typeof destination === 'object' && destination?.lat != null && destination?.lng != null) {
          destCoords = destination;
        } else {
          const query = typeof destination === 'string' ? destination : String(destination);
          if (!query.trim()) {
            throw new Error('Please enter a destination.');
          }
          const geocoded = await geocodePlace(
            /nashik/i.test(query) ? query : `${query}, Nashik, Maharashtra, India`
          );
          destCoords = geocoded;
        }

        if (isCancelled) return;

        // Geocode any waypoints that only have a text query
        const resolvedWaypoints = [];
        for (let i = 0; i < waypoints.length; i++) {
          const wp = waypoints[i];
          const stopNum = i + 1;
          if (wp.coords && !isNaN(wp.coords.lat) && !isNaN(wp.coords.lng)) {
            resolvedWaypoints.push({
              id: wp.id,
              lat: wp.coords.lat,
              lng: wp.coords.lng,
              stopNumber: stopNum,
              label: wp.coords.displayName || wp.query || `Stop ${stopNum}`,
            });
          } else if (wp.query && wp.query.trim()) {
            const q = wp.query.trim();
            try {
              const geocoded = await geocodePlace(
                /nashik/i.test(q) ? q : `${q}, Nashik, Maharashtra, India`
              );
              resolvedWaypoints.push({
                id: wp.id,
                lat: geocoded.lat,
                lng: geocoded.lng,
                stopNumber: stopNum,
                label: geocoded.displayName || q,
              });
            } catch (err) {
              console.warn(`Could not geocode Stop #${stopNum} ("${q}"):`, err);
            }
          }
        }

        if (isCancelled) return;
        setResolvedWaypointsList(resolvedWaypoints);

        const from = { 
          lat: userLocRef.current?.latitude ?? 20.0084, 
          lng: userLocRef.current?.longitude ?? 73.7635 
        };
        const to = { 
          lat: destCoords.lat, 
          lng: destCoords.lng 
        };

        // Fetch real road routes with stops in exact order through OSRM
        const routesData = await fetchRoadRoutes(from, to, { 
          waypoints: resolvedWaypoints, 
          alternatives: true 
        });
        
        if (isCancelled) return;

        // Format routes with basic metrics
        const formatted = routesData.map((r, idx) => ({
          id: idx + 1,
          name: resolvedWaypoints.length > 0 ? `Multi-Stop Route ${idx + 1}` : `Route ${idx + 1}`,
          label: resolvedWaypoints.length > 0 
            ? `Via ${resolvedWaypoints.length} Stop${resolvedWaypoints.length > 1 ? 's' : ''}` 
            : `Route ${idx + 1}`,
          distance: `${r.distanceKm.toFixed(1)} km`,
          time: `${Math.round(r.durationMin)} mins`,
          distanceKm: r.distanceKm,
          durationMin: r.durationMin,
          path: r.path,
          isMultiStop: resolvedWaypoints.length > 0,
          waypointCount: resolvedWaypoints.length,
        }));

        setRawRoutes(formatted);
        if (formatted.length > 0) {
          setSelectedRouteId(formatted[0].id);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to fetch road routes in UserRoutes:', err);
        setRouteError(err.message || 'Failed to calculate road routes.');
        setRawRoutes([]);
      } finally {
        if (!isCancelled) {
          setIsRoutingLoading(false);
        }
      }
    }

    loadRoadRoutes();

    return () => {
      isCancelled = true;
    };
  }, [destination, waypoints, reloadTrigger]);

  // Dynamically compute real risk score, nearby hotspots, and details for each route
  const computedRoutes = useMemo(() => {
    if (!rawRoutes || rawRoutes.length === 0) return [];

    const scored = rawRoutes.map((baseRoute) => {
      if (!hotspots || hotspots.length === 0) {
        return {
          ...baseRoute,
          riskScore: 0.05,
          riskLevel: 'LOW',
          color: '#22C55E',
          totalHotspots: 0,
          hotspotsEnRoute: [],
          details: `${baseRoute.name} — Clear corridor. 0 active accident hotspots detected within 500m buffer.`,
        };
      }

      // Check distance from route path to every backend hotspot (500m buffer)
      const nearby = findHotspotsNearRoute(baseRoute.path, hotspots, 500);
      const totalHotspots = nearby.length;

      if (totalHotspots === 0) {
        return {
          ...baseRoute,
          riskScore: 0.05,
          riskLevel: 'LOW',
          color: '#22C55E',
          totalHotspots: 0,
          hotspotsEnRoute: [],
          details: `${baseRoute.name} — Clear corridor. 0 active accident hotspots detected within 500m buffer.`,
        };
      }

      // Compute dynamic score based on nearest hotspots' scores and proximity
      let maxScore = 0;
      nearby.forEach((h) => {
        const base = typeof h.riskScore === 'number'
          ? h.riskScore
          : (h.riskLevel === 'CRITICAL' ? 0.85 : h.riskLevel === 'HIGH' ? 0.75 : h.riskLevel === 'MEDIUM' ? 0.5 : 0.2);
        const distFactor = h.distanceToRouteMeters <= 100
          ? 1.0
          : Math.max(0.7, 1.0 - 0.3 * ((h.distanceToRouteMeters - 100) / 400));
        const effective = Math.round(base * distFactor * 100) / 100;
        if (effective > maxScore) maxScore = effective;
      });

      const hasCritical = nearby.some((h) => h.riskLevel === 'CRITICAL');
      const hasHigh = nearby.some((h) => h.riskLevel === 'HIGH');
      let level = 'LOW';
      let color = '#22C55E';
      if (maxScore >= 0.75 || hasCritical) {
        level = 'CRITICAL';
        color = '#EF4444';
      } else if (maxScore >= 0.6 || hasHigh) {
        level = 'HIGH';
        color = '#F97316';
      } else if (maxScore >= 0.3) {
        level = 'MEDIUM';
        color = '#EAB308';
      }

      const hotspotNames = nearby.map((h) => `${h.name} (${h.distanceToRouteMeters}m)`).join(', ');
      const details = `Passes near: ${hotspotNames}. ${hasCritical ? 'Critical risk cluster en-route — maximum vigilance advised.' : 'Caution advised in vicinity of identified hazard.'}`;

      return {
        ...baseRoute,
        riskScore: maxScore,
        riskLevel: level,
        color,
        totalHotspots,
        hotspotsEnRoute: nearby.map((h) => ({
          name: h.name,
          risk: h.riskLevel,
          detail: `${h.distanceToRouteMeters}m from route`,
          distanceToRouteMeters: h.distanceToRouteMeters,
          lat: h.latitude ?? h.lat,
          lng: h.longitude ?? h.lng,
        })),
        details,
      };
    });

    // Identify the best Safe Route vs Fastest Route
    const fastest = [...scored].sort((a, b) => a.durationMin - b.durationMin)[0];
    const safest = [...scored].sort(
      (a, b) => a.totalHotspots - b.totalHotspots || a.riskScore - b.riskScore || a.durationMin - b.durationMin
    )[0];

    return scored.map((r) => {
      const isSafest = safest && r.id === safest.id;
      const isFastest = fastest && r.id === fastest.id;
      let tag = null;
      if (isSafest && isFastest) {
        tag = 'Safest & Fastest';
      } else if (isSafest) {
        tag = 'Safest Route';
      } else if (isFastest) {
        tag = 'Fastest Route';
      }

      return {
        ...r,
        isSafest,
        isFastest,
        tag,
        label: tag ? `${tag} (${r.label})` : r.label,
      };
    });
  }, [rawRoutes, hotspots]);

  // Filter routes based on user preference (All, Safest only, Fastest only)
  const displayedRoutes = useMemo(() => {
    if (routePreference === 'safest') {
      const safe = computedRoutes.find((r) => r.isSafest);
      return safe ? [safe] : computedRoutes;
    }
    if (routePreference === 'fastest') {
      const fast = computedRoutes.find((r) => r.isFastest);
      return fast ? [fast] : computedRoutes;
    }
    return computedRoutes;
  }, [computedRoutes, routePreference]);

  const selectedRoute = useMemo(() => {
    return displayedRoutes.find((r) => r.id === selectedRouteId) || displayedRoutes[0] || null;
  }, [displayedRoutes, selectedRouteId]);

  const handleSelectRoute = (route) => {
    if (!route) return;
    setSelectedRouteId(route.id);
    setToastType('info');
    setToastMessage(`${t('user.routes.toastSwitchedMap')} ${route.name}`);
  };

  const handleSearchDestination = (e) => {
    if (e) e.preventDefault();
    if (!destinationQuery.trim()) {
      setToastType('error');
      setToastMessage(t('user.navigation.toastEnterDestination') || 'Please enter a destination.');
      return;
    }
    setDestination(destinationQuery.trim());
    setReloadTrigger((v) => v + 1);
  };

  const handleNavigateSafely = () => {
    if (!selectedRoute) return;
    setToastType('success');
    setToastMessage(t('user.routes.toastPreSelecting').replace('{route}', selectedRoute.label));
    
    setTimeout(() => {
      navigate('/user/navigation', { 
        state: { 
          routeId: selectedRoute.id,
          selectedRoute: selectedRoute,
          destinationQuery: typeof destination === 'string' ? destination : destinationQuery,
          destinationCoords: typeof destination === 'object' && destination?.lat ? destination : null,
          waypoints: resolvedWaypointsList,
        } 
      });
    }, 800);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <NotificationToast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">{t('user.routes.eyebrow')}</span>
            <span className="text-gray-300 dark:text-uber-borderDark">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {t('user.routes.riskScored')}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-uber-text dark:text-white tracking-tight">
            {t('user.routes.title')}
          </h1>
          <p className="text-sm text-uber-muted dark:text-uber-mutedDark mt-1">
            {t('user.routes.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral">
            <Compass className="w-3.5 h-3.5 mr-1" />
            {computedRoutes.length} {t('user.routes.feasibleOptions')}
          </Badge>
          {resolvedWaypointsList.length > 0 && (
            <Badge variant="warning">
              {resolvedWaypointsList.length} Stops Active
            </Badge>
          )}
        </div>
      </div>

      {/* Hotspot & Routing Status Banners */}
      <div className="space-y-2">
        {/* 1. Loading State */}
        {isHotspotsLoading && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Analyzing corridors against live accident hotspots from database...</span>
          </div>
        )}

        {/* 2. Live Data State */}
        {!isHotspotsLoading && !isFallbackHotspots && !hotspotsError && (
          <div className="flex items-center justify-between p-2.5 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold">
                Live Hotspot Database Connected — {hotspots.length} active Nashik blackspots monitored in real time
              </span>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Live Data
            </span>
          </div>
        )}

        {/* 3. Offline Fallback State */}
        {!isHotspotsLoading && isFallbackHotspots && !hotspotsError && (
          <div className="flex items-center justify-between p-2.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Offline Fallback Active: Using verified 102 Nashik accident blackspots dataset</span>
            </div>
            <button
              type="button"
              onClick={fetchHotspots}
              className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Live
            </button>
          </div>
        )}

        {/* 4. API Error State */}
        {!isHotspotsLoading && hotspotsError && (
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>Hotspot API Notice: {hotspotsError}. Utilizing verified offline fallback dataset.</span>
            </div>
            <button
              type="button"
              onClick={fetchHotspots}
              className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer ml-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry API
            </button>
          </div>
        )}

        {/* OSRM Routing Engine Loading */}
        {isRoutingLoading && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Calculating real road-following route passing through all stops in order...</span>
          </div>
        )}

        {/* OSRM Routing Error Banner with Retry */}
        {routeError && (
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>Routing Service Notice: {routeError}</span>
            </div>
            <button
              type="button"
              onClick={() => setReloadTrigger((v) => v + 1)}
              className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer ml-3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Route
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Journey Destination, Multi-Stops & Route Comparison */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
          
          {/* Destination / Search Card with Multi-Stop Controls */}
          <Card 
            title="Route Planner & Multi-Stops" 
            subtitle="Plan road routes from live GPS with optional intermediate waypoints"
          >
            <form onSubmit={handleSearchDestination} className="space-y-3.5">
              {/* Origin indicator */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                  <LocateFixed className="w-3 h-3 text-emerald-500" />
                  {t('user.navigation.yourLiveLocation') || 'Origin (Live GPS)'}
                </label>
                <div className="mt-1 rounded-lg border border-gray-200 dark:border-uber-borderDark bg-gray-50/80 dark:bg-uber-dark px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 font-mono">
                  {userLoc.latitude.toFixed(4)}, {userLoc.longitude.toFixed(4)} (Nashik)
                </div>
              </div>

              {/* Intermediate Stops / Waypoints List (Multi-Stop Routing) */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-uber-borderDark">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
                    <span>Intermediate Stops ({waypoints.length}/5)</span>
                  </label>
                  {waypoints.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddWaypoint}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Add a stop to route"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Stop
                    </button>
                  )}
                </div>

                {waypoints.length === 0 ? (
                  <div className="py-2.5 px-3 rounded-lg border border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 text-center">
                    <p className="text-[11px] text-gray-500 dark:text-slate-400">
                      Direct Source → Destination active. Need to visit stops along the way?
                    </p>
                    <button
                      type="button"
                      onClick={handleAddWaypoint}
                      className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      + Add up to 5 intermediate stops
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {waypoints.map((wp, index) => (
                      <div 
                        key={wp.id} 
                        className="p-2.5 rounded-xl border border-gray-200 dark:border-uber-borderDark bg-gray-50/90 dark:bg-uber-dark space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Stop #{index + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveWaypoint(index, 'up')}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title="Move stop earlier in order"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === waypoints.length - 1}
                              onClick={() => handleMoveWaypoint(index, 'down')}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              title="Move stop later in order"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveWaypoint(wp.id)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-red-500 cursor-pointer ml-1 transition-colors"
                              title="Remove stop"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={wp.query}
                          onChange={(e) => handleWaypointQueryChange(wp.id, e.target.value)}
                          placeholder={`Enter stop #${index + 1} place (e.g. CBS, Panchavati, Nashik Road)`}
                          className="block w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-uber-text dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Input */}
              <div className="pt-2 border-t border-gray-100 dark:border-uber-borderDark">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">
                  {t('user.navigation.destinationLocation') || 'Final Destination'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="w-4 h-4 text-red-500" />
                    </div>
                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-uber-borderDark bg-gray-50 dark:bg-uber-dark text-uber-text dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                      placeholder={t('user.navigation.destinationPlaceholder') || 'Enter final destination'}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isRoutingLoading}
                    className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-900 font-semibold flex items-center justify-center transition-colors cursor-pointer shadow-sm"
                    title="Find routes through all points"
                  >
                    {isRoutingLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Card>

          {/* Preferred Route Cards with Safe vs Fastest Filter */}
          <Card 
            title={t('user.routes.availableCorridors')} 
            subtitle={resolvedWaypointsList.length > 0 ? `Corridors connecting origin, ${resolvedWaypointsList.length} stops, and destination` : t('user.routes.availableCorridorsSub')}
          >
            {/* Safe / Fastest Filter Pills */}
            {computedRoutes.length > 1 && (
              <div className="flex items-center gap-1.5 mb-3 p-1 rounded-xl bg-gray-100 dark:bg-uber-dark text-xs">
                <button
                  type="button"
                  onClick={() => setRoutePreference('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                    routePreference === 'all' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  All Corridors
                </button>
                <button
                  type="button"
                  onClick={() => setRoutePreference('safest')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    routePreference === 'safest' 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Safest
                </button>
                <button
                  type="button"
                  onClick={() => setRoutePreference('fastest')}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                    routePreference === 'fastest' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Fastest
                </button>
              </div>
            )}

            {isRoutingLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-uber-muted dark:text-uber-mutedDark">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mb-2" />
                <p className="font-semibold text-uber-text dark:text-white">Calculating real road routes...</p>
                <p className="text-[11px] mt-0.5">Visiting every stop in specified order via OSRM</p>
              </div>
            ) : displayedRoutes.length === 0 ? (
              <div className="text-center py-8 text-xs text-uber-muted dark:text-uber-mutedDark">
                {routeError ? (
                  <p className="text-red-500">{routeError}</p>
                ) : (
                  <p>No routes calculated yet. Please enter your destination and stops above.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedRoutes.map((route) => {
                  const isSelected = selectedRoute && selectedRoute.id === route.id;
                  return (
                    <div 
                      key={route.id}
                      onClick={() => handleSelectRoute(route)}
                      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer text-left ${
                        isSelected 
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 ring-1 ring-blue-600 dark:ring-blue-500 shadow-card scale-[1.01]' 
                          : 'border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400 bg-white dark:bg-uber-cardDark'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-uber-text dark:text-white block">
                              {route.name}
                            </span>
                            {isSelected ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                Active (Blue)
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Alternate (Green)
                              </span>
                            )}
                            {route.isSafest && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Safest
                              </span>
                            )}
                            {route.isFastest && !route.isSafest && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                Fastest
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-uber-muted dark:text-uber-mutedDark font-medium">
                            {route.label}
                          </span>
                        </div>
                        <RiskBadge level={route.riskLevel} />
                      </div>
                      
                      {/* Metrics strip */}
                      <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-gray-50/80 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark mb-3 text-xs">
                        <div>
                          <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark block font-bold uppercase">
                            {t('user.routes.risk')}
                          </span>
                          <span className={`font-mono font-bold ${
                            route.riskScore >= 0.7 ? 'text-red-600 dark:text-red-400' : route.riskScore >= 0.3 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {route.riskScore}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark block font-bold uppercase">
                            {t('user.routes.distance')}
                          </span>
                          <span className="text-uber-text dark:text-white font-bold">{route.distance}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark block font-bold uppercase">
                            {t('user.routes.hotspots')}
                          </span>
                          <span className={`font-bold ${route.totalHotspots === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {route.totalHotspots}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-uber-muted dark:text-uber-mutedDark leading-relaxed">
                        {route.details}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Selection Stats and Navigation Actions */}
          <Card 
            title={t('user.routes.selectedRouteProfile')}
            subtitle={t('user.routes.selectedRouteProfileSub')}
          >
            {selectedRoute ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark space-y-3">
                  <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200/80 dark:border-uber-borderDark">
                    <span className="font-bold text-uber-muted dark:text-uber-mutedDark uppercase">{t('user.routes.pathSelected')}</span>
                    <span className="font-bold text-uber-text dark:text-white">{selectedRoute.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase block">
                        {t('user.routes.travelDuration')}
                      </span>
                      <span className="text-base font-extrabold text-uber-text dark:text-white">
                        {selectedRoute.time}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase block">
                        {t('user.routes.safetyClearance')}
                      </span>
                      <span className="text-sm font-bold text-uber-text dark:text-white block mt-0.5">
                        {selectedRoute.totalHotspots === 0 ? t('user.routes.hazardFree') : t('user.routes.clusters').replace('{n}', selectedRoute.totalHotspots)}
                      </span>
                    </div>
                  </div>

                  {/* Multi-stop summary */}
                  {resolvedWaypointsList.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/80 dark:border-uber-borderDark text-[11px] text-gray-600 dark:text-slate-300">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">
                        Waypoints in route sequence ({resolvedWaypointsList.length}):
                      </span>
                      <ol className="list-decimal list-inside space-y-0.5 font-mono text-[10px] text-gray-500 dark:text-slate-400">
                        {resolvedWaypointsList.map((wp) => (
                          <li key={wp.id} className="truncate">
                            {wp.label}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Hotspot risk alert commentary */}
                  <div className="pt-2 text-xs">
                    {selectedRoute.totalHotspots === 0 ? (
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                        <span>{t('user.routes.hazardFree')} — Optimal clearance bypassing all identified hotspots.</span>
                      </div>
                    ) : selectedRoute.riskLevel === 'CRITICAL' ? (
                      <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Critical Hazard: Passes near {selectedRoute.hotspotsEnRoute[0]?.name}. Maximum vigilance required.</span>
                      </div>
                    ) : selectedRoute.riskLevel === 'HIGH' ? (
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Elevated Risk: Passes within {selectedRoute.hotspotsEnRoute[0]?.distanceToRouteMeters}m of {selectedRoute.hotspotsEnRoute[0]?.name}.</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>Moderate Option: Passes within {selectedRoute.hotspotsEnRoute[0]?.distanceToRouteMeters}m of {selectedRoute.hotspotsEnRoute[0]?.name}.</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleNavigateSafely}
                  className="w-full justify-center py-3"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {t('user.routes.navigateSafely')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-uber-muted dark:text-uber-mutedDark">
                {isRoutingLoading ? 'Calculating routes...' : 'No route currently selected.'}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Leaflet Map with Source, Waypoints, Destination & FitBounds */}
        <div className="lg:col-span-2 h-[300px] sm:h-[440px] lg:h-[660px] flex flex-col rounded-2xl overflow-hidden border border-gray-200/80 dark:border-uber-borderDark shadow-card order-first lg:order-last">
          <MapView 
            hotspots={hotspots}
            routes={computedRoutes}
            selectedRoute={selectedRoute}
            onSelectRoute={handleSelectRoute}
            userLocation={userLoc}
            enableSmoothLerp={true}
            sourceLocation={{ lat: userLoc.latitude, lng: userLoc.longitude, label: 'Your Location (Origin)' }}
            waypoints={resolvedWaypointsList}
            destinationLocation={typeof destination === 'object' && destination?.lat ? { lat: destination.lat, lng: destination.lng, label: destinationQuery } : null}
            onMapClick={async (latlng) => {
              setDestination(latlng);
              const label = `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
              setDestinationQuery(label);
              setToastType('info');
              setToastMessage('Destination selected from map.');
            }}
            showPins={true}
            showKde={true}
            showSpeedLimits={false}
            showRouteLegend={true}
            zoom={13}
            center={selectedRoute?.path?.[0] || [userLoc.latitude, userLoc.longitude]}
          />
        </div>
      </div>
    </div>
  );
}
