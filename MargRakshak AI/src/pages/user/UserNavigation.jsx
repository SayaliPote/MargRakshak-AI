import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MapView from '../../components/MapView';
import { getHotspots } from '../../services/api';
import { normalizeHotspot, getFallbackHotspots } from '../../data/hotspots';
import RiskBadge from '../../components/common/RiskBadge';
import NotificationToast from '../../components/common/NotificationToast';
import TelemetryHUD from '../../components/common/TelemetryHUD';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useTrackingSocket } from '../../hooks/useTrackingSocket';
import { useAuth } from '../../context/AuthContext';
import { voiceAlert } from '../../utils/voice';
import { getSpeechLang, t as tVoicePhrase, getSavedLanguage, buildHotspotAlertMessage, buildProximityAlertMessage, PHRASES } from '../../utils/i18n';
import { useLanguage } from '../../context/LanguageContext';
import { geocodePlace, reverseGeocode, fetchRoadRoutes } from '../../utils/geocode';
import { findHotspotsNearRoute, calculateDistanceMeters } from '../../utils/distance';
import {
  MapPin,
  Navigation,
  Volume2,
  VolumeX,
  Play,
  Square,
  AlertCircle,
  AlertTriangle,
  LocateFixed,
  Search,
  Loader2,
  RotateCcw,
  Crosshair,
  CheckCircle2,
  X,
  Car,
  Bike,
  ShieldAlert,
  Activity,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Route as RouteIcon,
  Layers,
  Check,
  Radio,
  Gauge
} from 'lucide-react';

function buildRouteSummary(rawRoute, activeHotspots = []) {
  const hotspotsEnRoute = findHotspotsNearRoute(rawRoute.path, activeHotspots, 350);
  const hasCritical = hotspotsEnRoute.some((h) => h.riskLevel === 'CRITICAL');
  const hasHigh = hotspotsEnRoute.some((h) => h.riskLevel === 'HIGH');

  let riskLevel = 'LOW';
  if (hasCritical) {
    riskLevel = 'HIGH';
  } else if (hasHigh || hotspotsEnRoute.length >= 2) {
    riskLevel = 'MODERATE';
  }

  return {
    ...rawRoute,
    distance: `${rawRoute.distanceKm.toFixed(1)} km`,
    time: `${Math.round(rawRoute.durationMin)} mins`,
    riskLevel,
    totalHotspots: hotspotsEnRoute.length,
    hotspotsEnRoute: hotspotsEnRoute.map((h) => ({
      name: h.name,
      risk: h.riskLevel,
      detail: `${h.distanceToRouteMeters} m from route`,
      lat: h.latitude ?? h.lat,
      lng: h.longitude ?? h.lng,
    })),
  };
}

export default function UserNavigation() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { location: userLoc, status: locationStatus, error: locationError, heartbeatTick } = useGeolocation(true);
  const [vehicleType, setVehicleType] = useState('car');
  const [isNavigating, setIsNavigating] = useState(false);
  const [followCamera, setFollowCamera] = useState(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(false);
  const [navigationStats, setNavigationStats] = useState({
    distanceRemainingMeters: 0,
    etaMinutes: 0,
    nearestBlackspot: null,
    nearestBlackspotDistanceM: null,
  });

  // Tracking WebSocket hook for 1-second telemetry broadcasting
  const { isConnected: isSocketConnected, latencyMs } = useTrackingSocket({
    enabled: isNavigating,
    location: userLoc,
    userName: user?.full_name || 'Driver #1',
    vehicleType,
    vehicleColor: '#2563eb',
  });

  // Deduplication cache for voice alerts
  const alertedThresholds = useRef({});
  const hasAnnouncedArrival = useRef(false);

  // Source state: live GPS by default, can be overridden by picking on map
  const [sourceLabel, setSourceLabel] = useState(t('user.navigation.fetchingLocation'));
  const [customSourceCoords, setCustomSourceCoords] = useState(null); // { lat, lng }

  // Destination (Blank by default per Requirement 2)
  const [destinationQuery, setDestinationQuery] = useState(() => routerLocation.state?.destinationQuery || '');
  const [destinationCoords, setDestinationCoords] = useState(() => routerLocation.state?.destinationCoords || null);

  // Dynamic intermediate stops / waypoints: Source -> Stop 1 -> Stop 2 -> Stop 3 -> Destination
  const [waypoints, setWaypoints] = useState(() => {
    if (Array.isArray(routerLocation.state?.waypoints) && routerLocation.state.waypoints.length > 0) {
      return routerLocation.state.waypoints.map((wp, idx) => ({
        id: wp.id || `stop_${Date.now()}_${idx}`,
        query: wp.label || wp.displayName || '',
        coords: wp.lat && wp.lng ? { lat: wp.lat, lng: wp.lng, displayName: wp.label } : null,
      }));
    }
    return [];
  });

  // Manual map location selection modes
  // pickingMode can be: 'source' | 'destination' | { type: 'stop', id: string, index: number } | null
  const [pickingMode, setPickingMode] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null); // { lat, lng, label }

  // Available route alternatives: Route 1, Route 2
  const [availableRoutes, setAvailableRoutes] = useState(() => {
    if (routerLocation.state?.selectedRoute) {
      const initRoute = {
        ...routerLocation.state.selectedRoute,
        id: 'route-1',
        label: 'Route 1',
        routeNumber: 1
      };
      return [initRoute];
    }
    return [];
  });

  const [selectedRouteId, setSelectedRouteId] = useState(() => {
    return routerLocation.state?.selectedRoute ? 'route-1' : null;
  });

  const [isSearchingRoute, setIsSearchingRoute] = useState(false);
  const [filterRouteHotspotsOnly, setFilterRouteHotspotsOnly] = useState(true);

  // Unified Blackspots dataset with live DB & offline fallback
  const [hotspots, setHotspots] = useState(getFallbackHotspots);
  const [isHotspotsLoading, setIsHotspotsLoading] = useState(true);
  const [isFallbackHotspots, setIsFallbackHotspots] = useState(false);
  const [hotspotsError, setHotspotsError] = useState(null);

  const loadHotspots = useCallback(async () => {
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
        setHotspots(getFallbackHotspots());
        setIsFallbackHotspots(true);
      }
    } catch (err) {
      console.warn('Backend unreachable in UserNavigation, using fallback mock hotspots:', err);
      setHotspots(getFallbackHotspots());
      setIsFallbackHotspots(true);
      setHotspotsError(err.message || 'API connection failed');
    } finally {
      setIsHotspotsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots]);

  const [voiceOn, setVoiceOn] = useState(false);
  const [alertLang] = useState(() => getSavedLanguage() || 'en');
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const hasReverseGeocoded = useRef(false);

  // Currently selected active route object
  const selectedRoute = useMemo(() => {
    if (!availableRoutes || availableRoutes.length === 0) return null;
    return availableRoutes.find((r) => r.id === selectedRouteId) || availableRoutes[0];
  }, [availableRoutes, selectedRouteId]);

  // GPS fix reverse geocode
  useEffect(() => {
    if (customSourceCoords) return;
    if (locationStatus === 'active' && !hasReverseGeocoded.current) {
      hasReverseGeocoded.current = true;
      reverseGeocode(userLoc.latitude, userLoc.longitude).then((label) => {
        setSourceLabel(label || `${t('user.navigation.yourLocationFallback')} (${userLoc.latitude.toFixed(4)}, ${userLoc.longitude.toFixed(4)})`);
      });
    } else if (locationStatus === 'error') {
      setSourceLabel(`${t('user.navigation.locationUnavailable')} (${userLoc.latitude.toFixed(4)}, ${userLoc.longitude.toFixed(4)})`);
    } else if (locationStatus === 'locating') {
      setSourceLabel(t('user.navigation.fetchingLocation'));
    }
  }, [locationStatus, userLoc.latitude, userLoc.longitude, customSourceCoords, t]);

  // Waypoint / Intermediate Stops Management
  const handleAddStop = () => {
    if (waypoints.length >= 5) {
      setToastType('error');
      setToastMessage('Maximum 5 intermediate stops allowed.');
      return;
    }
    const newId = `stop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setWaypoints((prev) => [...prev, { id: newId, query: '', coords: null }]);
  };

  const handleRemoveStop = (id) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
    // Reset route if stops changed
    setAvailableRoutes([]);
    setSelectedRouteId(null);
  };

  const handleMoveStop = (index, direction) => {
    setWaypoints((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    // Reset route if stops reordered
    setAvailableRoutes([]);
    setSelectedRouteId(null);
  };

  const handleStopQueryChange = (id, value) => {
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, query: value, coords: null } : w))
    );
  };

  // Map click handler (supports Source, Stops, Destination, and General click)
  const handleMapClick = async ({ lat, lng }) => {
    if (pickingMode === 'source') {
      setCustomSourceCoords({ lat, lng });
      setSourceLabel(`Selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setPickingMode(null);
      setToastType('success');
      setToastMessage('Source location selected from map.');
      try {
        const placeName = await reverseGeocode(lat, lng);
        if (placeName) setSourceLabel(placeName);
      } catch {}
    } else if (pickingMode === 'destination') {
      const coords = { lat, lng, displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
      setDestinationCoords(coords);
      setDestinationQuery(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setPickingMode(null);
      setToastType('success');
      setToastMessage('Destination selected from map.');
      try {
        const placeName = await reverseGeocode(lat, lng);
        if (placeName) {
          setDestinationCoords({ lat, lng, displayName: placeName });
          setDestinationQuery(placeName);
        }
      } catch {}
    } else if (pickingMode && typeof pickingMode === 'object' && pickingMode.type === 'stop') {
      const stopId = pickingMode.id;
      const stopNumber = pickingMode.index + 1;
      const display = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      setWaypoints((prev) =>
        prev.map((w) =>
          w.id === stopId ? { ...w, query: display, coords: { lat, lng, displayName: display } } : w
        )
      );
      setPickingMode(null);
      setToastType('success');
      setToastMessage(`Stop #${stopNumber} set from map.`);

      try {
        const placeName = await reverseGeocode(lat, lng);
        if (placeName) {
          setWaypoints((prev) =>
            prev.map((w) =>
              w.id === stopId ? { ...w, query: placeName, coords: { lat, lng, displayName: placeName } } : w
            )
          );
        }
      } catch {}
    } else {
      // General click: prompt to set as Source, Stop, or Destination
      setClickedPoint({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      try {
        const placeName = await reverseGeocode(lat, lng);
        if (placeName) {
          setClickedPoint({ lat, lng, label: placeName });
        }
      } catch {}
    }
  };

  const handleSetFromClicked = (type) => {
    if (!clickedPoint) return;
    if (type === 'source') {
      setCustomSourceCoords({ lat: clickedPoint.lat, lng: clickedPoint.lng });
      setSourceLabel(clickedPoint.label);
      setToastType('success');
      setToastMessage('Source location updated from map.');
    } else if (type === 'destination') {
      setDestinationCoords({ lat: clickedPoint.lat, lng: clickedPoint.lng, displayName: clickedPoint.label });
      setDestinationQuery(clickedPoint.label);
      setToastType('success');
      setToastMessage('Destination location updated from map.');
    } else if (type === 'stop') {
      if (waypoints.length >= 5) {
        setToastType('error');
        setToastMessage('Maximum 5 intermediate stops allowed.');
      } else {
        const newId = `stop_${Date.now()}`;
        setWaypoints((prev) => [
          ...prev,
          {
            id: newId,
            query: clickedPoint.label,
            coords: { lat: clickedPoint.lat, lng: clickedPoint.lng, displayName: clickedPoint.label },
          },
        ]);
        setToastType('success');
        setToastMessage(`Added Stop: ${clickedPoint.label}`);
      }
    }
    setClickedPoint(null);
  };

  const handleResetGpsSource = () => {
    setCustomSourceCoords(null);
    hasReverseGeocoded.current = false;
    setSourceLabel(t('user.navigation.fetchingLocation'));
    setToastType('info');
    setToastMessage('Reset to live GPS location.');
  };

  // Find routes including all intermediate stops + alternatives (Path A / Path B)
  const handleFindRoute = async () => {
    if (!destinationQuery.trim() && !destinationCoords) {
      setToastType('error');
      setToastMessage('Please enter or pick a destination on the map.');
      return;
    }

    setIsSearchingRoute(true);
    setAvailableRoutes([]);
    setSelectedRouteId(null);

    try {
      // 1. Resolve Destination coordinates
      let dest = destinationCoords;
      if (!dest || !dest.lat || !dest.lng) {
        dest = await geocodePlace(
          /nashik/i.test(destinationQuery) ? destinationQuery : `${destinationQuery}, Nashik, Maharashtra, India`
        );
        setDestinationCoords(dest);
      }

      // 2. Resolve Source coordinates
      const from = customSourceCoords || { lat: userLoc.latitude, lng: userLoc.longitude };
      if (isNaN(from.lat) || isNaN(from.lng)) {
        throw new Error('Valid starting source coordinates not available. Please pick source on map.');
      }

      // 3. Resolve all intermediate waypoints
      const resolvedWaypoints = [];
      for (let i = 0; i < waypoints.length; i++) {
        const wp = waypoints[i];
        if (wp.coords && !isNaN(wp.coords.lat) && !isNaN(wp.coords.lng)) {
          resolvedWaypoints.push({
            id: wp.id,
            lat: wp.coords.lat,
            lng: wp.coords.lng,
            label: wp.coords.displayName || wp.query || `Stop ${i + 1}`,
            stopNumber: i + 1,
          });
        } else if (wp.query && wp.query.trim()) {
          const q = /nashik/i.test(wp.query) ? wp.query : `${wp.query}, Nashik, Maharashtra, India`;
          try {
            const geocoded = await geocodePlace(q);
            resolvedWaypoints.push({
              id: wp.id,
              lat: geocoded.lat,
              lng: geocoded.lng,
              label: geocoded.displayName || wp.query,
              stopNumber: i + 1,
            });
            // Update waypoint in state with resolved coordinates
            setWaypoints((prev) =>
              prev.map((item) => (item.id === wp.id ? { ...item, coords: geocoded } : item))
            );
          } catch (err) {
            console.warn(`Could not resolve Stop ${i + 1}:`, err);
            throw new Error(`Could not find location for Stop #${i + 1} ("${wp.query}"). Please refine or pick on map.`);
          }
        }
      }

      // 4. Fetch routes from OSRM with alternatives requested
      const rawRoutes = await fetchRoadRoutes(from, dest, { 
        waypoints: resolvedWaypoints,
        alternatives: true 
      });

      if (!rawRoutes || rawRoutes.length === 0) {
        throw new Error('No drivable road route found connecting all points.');
      }

      // 5. Build Route 1, Route 2 summaries with blackspot calculation
      const summarized = rawRoutes.map((r, idx) => {
        const summary = buildRouteSummary(r, hotspots);
        const routeNum = idx + 1;
        return {
          ...summary,
          id: `route-${routeNum}`,
          label: `Route ${routeNum}`,
          routeNumber: routeNum,
          tag: idx === 0 ? 'Route 1 (Primary / Recommended)' : 'Route 2 (Alternative Corridor)',
          isAlternative: idx > 0,
        };
      });

      setAvailableRoutes(summarized);
      setSelectedRouteId(summarized[0]?.id || 'route-1');

      setToastType('success');
      const destName = (dest.displayName || destinationQuery).split(',')[0];
      setToastMessage(
        summarized.length > 1
          ? `Found 2 route options (Route 1 & Route 2) to ${destName}.`
          : `Route calculated successfully to ${destName}.`
      );
    } catch (err) {
      setToastType('error');
      setToastMessage(err.message || t('user.navigation.toastCouldNotFindRoute'));
    } finally {
      setIsSearchingRoute(false);
    }
  };

  const handleVoiceToggle = () => {
    const nextVoiceState = !voiceOn;
    setVoiceOn(nextVoiceState);
    voiceAlert.setMute(!nextVoiceState);

    if (nextVoiceState) {
      setToastType('success');
      setToastMessage(t('user.navigation.toastVoiceActive'));
      voiceAlert.speak(tVoicePhrase('voiceActivated', alertLang), getSpeechLang(alertLang));
    } else {
      setToastType('info');
      setToastMessage(t('user.navigation.toastVoiceMuted'));
      voiceAlert.cancel();
    }
  };

  const handleStartTrip = () => {
    if (!selectedRoute) {
      setToastType('error');
      setToastMessage(t('user.navigation.toastFindRouteFirst'));
      return;
    }

    setIsNavigating(true);
    hasAnnouncedArrival.current = false;
    alertedThresholds.current = {};

    setToastType('success');
    setToastMessage('Live GPS navigation active. Tracking along active route.');

    if (voiceOn) {
      voiceAlert.speak(tVoicePhrase('tripStarted', alertLang), getSpeechLang(alertLang));
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    voiceAlert.cancel();
    alertedThresholds.current = {};
    hasAnnouncedArrival.current = false;
    setToastType('info');
    setToastMessage('Live navigation stopped.');
  };

  // Continuous Proximity & Blackspot Safety Monitor along active selected route
  useEffect(() => {
    if (!isNavigating || !selectedRoute) return;

    // 1. Destination distance check
    if (destinationCoords && destinationCoords.lat && destinationCoords.lng) {
      const distToDest = calculateDistanceMeters(
        userLoc.latitude,
        userLoc.longitude,
        destinationCoords.lat,
        destinationCoords.lng
      );
      const speedKmh = Math.max(15, userLoc.speed || 30);
      const estEta = Math.max(1, Math.round((distToDest / 1000) / (speedKmh / 60)));

      if (distToDest <= 40 && !hasAnnouncedArrival.current) {
        hasAnnouncedArrival.current = true;
        const msg = PHRASES.arrived[alertLang] || 'You have arrived at your destination.';
        setToastType('success');
        setToastMessage(msg);
        if (voiceOn) {
          voiceAlert.speak(msg, getSpeechLang(alertLang));
        }
      }

      // 2. Active route blackspots proximity check (deduplicated per active route)
      const routeHotspots = selectedRoute.hotspotsEnRoute || [];
      let closestSpot = null;
      let minSpotDist = Infinity;

      const ALERT_THRESHOLDS = [1000, 500, 200];

      for (const spot of routeHotspots) {
        const spotLat = spot.lat ?? spot.latitude;
        const spotLng = spot.lng ?? spot.longitude;
        if (spotLat == null || spotLng == null) continue;

        const dM = Math.round(
          calculateDistanceMeters(userLoc.latitude, userLoc.longitude, spotLat, spotLng)
        );

        if (dM < minSpotDist) {
          minSpotDist = dM;
          closestSpot = spot;
        }

        // Deduplication set per blackspot name
        if (!alertedThresholds.current[spot.name]) {
          alertedThresholds.current[spot.name] = new Set();
        }
        const spokenSet = alertedThresholds.current[spot.name];

        for (const thresh of ALERT_THRESHOLDS) {
          if (dM <= thresh && !spokenSet.has(thresh)) {
            spokenSet.add(thresh);
            const msg = buildHotspotAlertMessage(alertLang, spot.risk, spot.name, thresh);
            setToastType(thresh <= 200 ? 'warning' : 'info');
            setToastMessage(msg);
            if (voiceOn) {
              voiceAlert.speak(msg, getSpeechLang(alertLang));
            }
          }
        }
      }

      setNavigationStats({
        distanceRemainingMeters: Math.round(distToDest),
        etaMinutes: estEta,
        nearestBlackspot: closestSpot,
        nearestBlackspotDistanceM: minSpotDist !== Infinity ? minSpotDist : null,
      });
    }
  }, [isNavigating, userLoc, selectedRoute, destinationCoords, voiceOn, alertLang]);

  const isLiveFix = locationStatus === 'active';
  const effectiveSource = customSourceCoords || { lat: userLoc.latitude, lng: userLoc.longitude };

  // Formatted waypoints for MapView
  const mapWaypoints = useMemo(() => {
    return waypoints
      .map((w, idx) => {
        if (!w.coords || isNaN(w.coords.lat) || isNaN(w.coords.lng)) return null;
        return {
          id: w.id,
          lat: w.coords.lat,
          lng: w.coords.lng,
          label: w.coords.displayName || w.query || `Stop ${idx + 1}`,
          stopNumber: idx + 1,
        };
      })
      .filter(Boolean);
  }, [waypoints]);

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 max-w-7xl mx-auto">
      {/* Toast popup */}
      {toastMessage && (
        <NotificationToast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-navy-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
            <RouteIcon className="w-6 h-6 text-blue-600" />
            {t('user.navigation.pageTitle')}
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">
            {t('user.navigation.pageSubtitle')}
          </p>
        </div>

        {/* Live GPS Status & Vehicle Mode Switch */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${locationStatus === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${locationStatus === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
              {locationStatus === 'active' ? 'GPS Active' : 'Acquiring GPS'}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              ±{userLoc.accuracy ? Math.round(userLoc.accuracy) : 8}m
            </span>
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setVehicleType('car')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                vehicleType === 'car' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>Car</span>
            </button>
            <button
              type="button"
              onClick={() => setVehicleType('bike')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                vehicleType === 'bike' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Bike</span>
            </button>
            <button
              type="button"
              onClick={() => setVehicleType('emergency')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                vehicleType === 'emergency' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Emergency</span>
            </button>
          </div>
        </div>
      </div>

      {/* Location Permission Status Banners */}
      {locationStatus === 'denied' && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-sm">GPS Location Access Required for Live Tracking</div>
            <p className="mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">
              Location tracking permission is currently denied or blocked in your browser. Live GPS navigation and telemetry require location permissions. You can enable it in your browser address bar (lock icon) or pick start and destination locations directly on the map.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      () => window.location.reload(),
                      (err) => console.warn(err),
                      { enableHighAccuracy: true, timeout: 5000 }
                    );
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                Retry GPS Permission
              </button>
            </div>
          </div>
        </div>
      )}

      {locationStatus === 'timeout' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>GPS Fix Timeout: Attempting to acquire a clean satellite lock.</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-md text-[11px] hover:bg-amber-700 cursor-pointer"
          >
            Retry Fix
          </button>
        </div>
      )}

      {/* Active Navigation Live Corridor Status Banner */}
      {isNavigating && selectedRoute && (
        <div className="p-3.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl shadow-xl border border-blue-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400 flex items-center justify-center text-blue-300">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>Live Navigation: {selectedRoute.label || 'Active Route'}</span>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Active GPS
                </span>
              </div>
              <div className="text-slate-300 text-[11px] flex items-center gap-2 mt-0.5">
                <span>Dist: <strong>{(navigationStats.distanceRemainingMeters / 1000).toFixed(1)} km</strong></span>
                <span>&bull;</span>
                <span>ETA: <strong>~{navigationStats.etaMinutes} mins</strong></span>
                <span>&bull;</span>
                <span>Speed: <strong>{Math.round(userLoc.speed || 0)} km/h</strong></span>
                {isSocketConnected && (
                  <>
                    <span>&bull;</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> WebSocket Live {latencyMs ? `(${latencyMs}ms)` : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {navigationStats.nearestBlackspot && (
              <div className="px-2.5 py-1.5 rounded-lg bg-red-950/70 border border-red-500/50 text-[11px] text-red-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span>
                  Corridor Hazard: <strong>{navigationStats.nearestBlackspot.name}</strong> ({navigationStats.nearestBlackspotDistanceM}m)
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleStopNavigation}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm text-xs"
            >
              <Square className="w-3.5 h-3.5" /> Stop Navigation
            </button>
          </div>
        </div>
      )}

      {/* Manual Selection Active Mode Banner */}
      {pickingMode && (
        <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold">
              {pickingMode === 'source'
                ? 'Click anywhere on the map to set Source (Starting Location)'
                : pickingMode === 'destination'
                ? 'Click anywhere on the map to set Destination'
                : `Click anywhere on the map to set Stop #${(pickingMode?.index ?? 0) + 1}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPickingMode(null)}
            className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Cancel Selection
          </button>
        </div>
      )}

      {/* Clicked Map Location Prompt */}
      {clickedPoint && !pickingMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 text-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-700 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Selected point: <strong className="text-white">{clickedPoint.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetFromClicked('source')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Set as Source
            </button>
            <button
              type="button"
              onClick={() => handleSetFromClicked('stop')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Add as Stop
            </button>
            <button
              type="button"
              onClick={() => handleSetFromClicked('destination')}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
            >
              Set as Destination
            </button>
            <button
              type="button"
              onClick={() => setClickedPoint(null)}
              className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container: Map prioritizes approx 70% of available space on desktop, responsive on mobile/tablet */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">

        {/* Left Column: Multi-Stop Route Form & Alternatives (~30% on desktop) */}
        <div className="w-full lg:w-[360px] xl:w-[400px] shrink-0 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-140px)] pr-0 lg:pr-1 order-last lg:order-first">

          {/* Route Planner Form Card */}
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-3.5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2">
              <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" /> Route Planner
              </h2>
              {waypoints.length > 0 && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  {waypoints.length} stop{waypoints.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* 1. Source */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                    <LocateFixed className={`w-3.5 h-3.5 ${customSourceCoords ? 'text-emerald-500' : (isLiveFix ? 'text-green-500' : 'text-amber-500')}`} />
                    <span>Source</span>
                  </label>
                  {customSourceCoords && (
                    <button
                      type="button"
                      onClick={handleResetGpsSource}
                      className="text-[10px] text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      Reset to GPS
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300 truncate">
                    {sourceLabel}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickingMode(pickingMode === 'source' ? null : 'source')}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer min-h-[36px] ${
                      pickingMode === 'source'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50'
                    }`}
                    title="Click on map to select starting point"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="hidden sm:inline">Pick</span>
                  </button>
                </div>
              </div>

              {/* 2. Destination */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">
                  {t('user.navigation.destinationLocation')}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => {
                        setDestinationQuery(e.target.value);
                        setDestinationCoords(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleFindRoute()}
                      className="block w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[36px]"
                      placeholder="Enter destination or pick on map..."
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setPickingMode(pickingMode === 'destination' ? null : 'destination')}
                    className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer min-h-[36px] ${
                      pickingMode === 'destination'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50'
                    }`}
                    title="Click on map to select destination"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="hidden sm:inline">Pick</span>
                  </button>
                </div>
              </div>

              {/* 3. + Add Stop Option (Requirement 4: Directly below Destination input box) */}
              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={handleAddStop}
                  disabled={waypoints.length >= 5}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer disabled:opacity-40 py-1 px-1 rounded"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Stop</span>
                </button>
              </div>

              {/* 4. Intermediate Stops (Rendered directly under + Add Stop) */}
              {waypoints.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-dashed border-gray-200 dark:border-slate-700">
                  {waypoints.map((wp, idx) => {
                    const stopNumber = idx + 1;
                    const isPickingThis = pickingMode && typeof pickingMode === 'object' && pickingMode.type === 'stop' && pickingMode.id === wp.id;

                    return (
                      <div key={wp.id} className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 space-y-1.5 transition-all">
                        <div className="flex items-center justify-between text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">
                              {stopNumber}
                            </span>
                            <span>Stop {stopNumber}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStop(idx, 'up')}
                              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move stop earlier"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === waypoints.length - 1}
                              onClick={() => handleMoveStop(idx, 'down')}
                              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move stop later"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStop(wp.id)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer ml-1"
                              title="Remove stop"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={wp.query}
                            onChange={(e) => handleStopQueryChange(wp.id, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFindRoute()}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            placeholder={`Enter Stop ${stopNumber} or pick on map...`}
                          />
                          <button
                            type="button"
                            onClick={() => setPickingMode(isPickingThis ? null : { type: 'stop', id: wp.id, index: idx })}
                            className={`shrink-0 px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                              isPickingThis
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100/50'
                            }`}
                            title={`Click on map to pick Stop #${stopNumber}`}
                          >
                            <Crosshair className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span className="hidden sm:inline">Pick</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Find Route action button */}
            <button
              type="button"
              onClick={handleFindRoute}
              disabled={isSearchingRoute || (!destinationQuery.trim() && !destinationCoords)}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer min-h-[42px]"
            >
              {isSearchingRoute ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculating 2 Route Options...</span>
                </>
              ) : (
                <>
                  <RouteIcon className="w-4 h-4" />
                  <span>Calculate Available Routes</span>
                </>
              )}
            </button>
          </div>

          {/* ROUTE 1 / ROUTE 2 Selection Section (Requirement 3) */}
          {availableRoutes && availableRoutes.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Route Alternatives ({availableRoutes.length})
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                  Tap Route to Select
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availableRoutes.slice(0, 2).map((routeOption, idx) => {
                  const isSelected = selectedRoute?.id === routeOption.id;
                  const routeNum = idx + 1;

                  return (
                    <div
                      key={routeOption.id}
                      onClick={() => setSelectedRouteId(routeOption.id)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 shadow-md ring-2 ring-blue-500/20'
                          : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-black uppercase ${
                            isSelected 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-emerald-600 text-white'
                          }`}>
                            <span>Route {routeNum}</span>
                          </span>
                          {isSelected ? (
                            <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">
                              <Check className="w-3.5 h-3.5" /> Active (Blue)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                              Alternate (Green)
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">Distance</span>
                            <span className="font-extrabold text-navy-950 dark:text-white text-sm">{routeOption.distance}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-medium">Est. Time</span>
                            <span className="font-extrabold text-navy-950 dark:text-white text-sm">{routeOption.time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-slate-700/60 flex items-center justify-between">
                        <RiskBadge level={routeOption.riskLevel} />
                        <span className="text-[10px] text-gray-500 font-bold">
                          {routeOption.totalHotspots === 0 ? '0 blackspots' : `${routeOption.totalHotspots} blackspot${routeOption.totalHotspots > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Selected Route Safety Summary Card */}
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 pb-2">
              <h3 className="text-sm font-bold text-navy-950 dark:text-white uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                {selectedRoute ? `Route Safety: ${selectedRoute.label || 'Active Route'}` : 'Route Safety Summary'}
              </h3>
              {selectedRoute && (
                <button
                  type="button"
                  onClick={() => setFilterRouteHotspotsOnly(!filterRouteHotspotsOnly)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                    filterRouteHotspotsOnly
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                  title="Toggle between showing only corridor blackspots vs all city blackspots"
                >
                  {filterRouteHotspotsOnly ? 'Corridor Only' : 'Show All'}
                </button>
              )}
            </div>

            {selectedRoute ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold block uppercase">{t('user.navigation.estDistance')}</span>
                    <span className="text-xl font-black text-navy-950 dark:text-white">{selectedRoute.distance}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold block uppercase">{t('user.navigation.estTime')}</span>
                    <span className="text-xl font-black text-navy-950 dark:text-white">{selectedRoute.time}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold block uppercase mb-1">{t('user.navigation.accidentRiskLevel')}</span>
                  <RiskBadge level={selectedRoute.riskLevel} />
                </div>

                {/* En-route Blackspots List strictly for Selected Route */}
                <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block uppercase mb-2">
                    {t('user.navigation.enRouteHotspots')} ({selectedRoute.totalHotspots})
                  </span>

                  {selectedRoute.totalHotspots > 0 ? (
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {selectedRoute.hotspotsEnRoute.map((spot, i) => (
                        <div key={i} className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-red-900 dark:text-red-200">{spot.name}</div>
                            <div className="text-[10px] text-red-700 dark:text-red-300">{spot.detail} ({spot.risk} risk)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg font-semibold text-center border border-blue-200 dark:border-blue-900">
                      Zero critical clusters en-route. Clean safe path.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 p-6 rounded-xl text-center border border-dashed border-gray-200 dark:border-slate-700">
                Enter source, destination, and any stops, then calculate to view 2 route options.
              </div>
            )}

            {/* Start Trip & Mute Controls */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`py-2 px-3 rounded-lg border text-center flex items-center justify-center font-bold text-xs cursor-pointer transition min-h-[42px] ${
                  voiceOn
                    ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200'
                    : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={voiceOn ? t('user.navigation.muteVoice') : t('user.navigation.unmuteVoice')}
              >
                {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span className="ml-1 hidden sm:inline">{voiceOn ? t('user.navigation.on') : t('user.navigation.off')}</span>
              </button>
              {isNavigating ? (
                <button
                  type="button"
                  onClick={handleStopNavigation}
                  className="col-span-2 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors border border-rose-500 flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer min-h-[42px]"
                >
                  <Square className="w-4 h-4" /> Stop Navigation
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTrip}
                  disabled={!selectedRoute}
                  className="col-span-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors border border-blue-500 flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer min-h-[42px]"
                >
                  <Play className="w-4 h-4" /> Start Navigation
                </button>
              )}
            </div>

            {/* Quick Link to Detailed Alerts Hub */}
            {selectedRoute && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    const alternate = availableRoutes.find((r) => r.id !== selectedRoute.id) || null;
                    navigate('/user/alerts', {
                      state: {
                        liveRoute: selectedRoute,
                        alternateRoute: alternate,
                        destinationLabel: destinationCoords?.displayName || destinationQuery,
                        destinationCoords,
                        waypoints: waypoints.map((w, idx) => ({
                          id: w.id,
                          lat: w.coords?.lat,
                          lng: w.coords?.lng,
                          label: w.coords?.displayName || w.query || `Stop ${idx + 1}`,
                          stopNumber: idx + 1,
                        })).filter(w => w.lat && w.lng),
                        sourceCoords: customSourceCoords || { lat: userLoc.latitude, lng: userLoc.longitude },
                        sourceLabel,
                        voiceOn,
                        alertLang,
                        vehicleType,
                      },
                    });
                  }}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1 w-full"
                >
                  <span>Open Full Alerts Screen in Alert Hub</span>
                  <Navigation className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full-Height Leaflet Map with Satellite/Roadmap (~70% Map space) */}
        <div className="flex-1 min-w-0 w-full h-[55vw] min-h-[350px] sm:h-[65vh] lg:h-[calc(100vh-140px)] lg:min-h-[480px] flex flex-col relative rounded-2xl overflow-hidden border border-gray-200/80 dark:border-slate-700 shadow-md order-first lg:order-last">
          <MapView
            hotspots={hotspots}
            routes={availableRoutes}
            selectedRoute={selectedRoute}
            onSelectRoute={(r) => setSelectedRouteId(r.id)}
            userLocation={customSourceCoords ? null : userLoc}
            vehicleType={vehicleType}
            enableSmoothLerp={true}
            followUser={isNavigating && followCamera}
            showBreadcrumbs={showBreadcrumbs}
            sourceLocation={effectiveSource ? { lat: effectiveSource.lat, lng: effectiveSource.lng, label: sourceLabel } : null}
            waypoints={mapWaypoints}
            destinationLocation={destinationCoords ? { lat: destinationCoords.lat, lng: destinationCoords.lng, label: destinationQuery } : null}
            selectedPoint={clickedPoint}
            onMapClick={handleMapClick}
            routeHotspotsOnly={filterRouteHotspotsOnly && Boolean(selectedRoute)}
            onSelectAsSource={(spot) => {
              setCustomSourceCoords({ lat: spot.lat, lng: spot.lng });
              setSourceLabel(spot.name);
              setToastType('success');
              setToastMessage(`Source set to ${spot.name}.`);
            }}
            onSelectAsDestination={(spot) => {
              setDestinationCoords({ lat: spot.lat, lng: spot.lng, displayName: spot.name });
              setDestinationQuery(spot.name);
              setToastType('success');
              setToastMessage(`Destination set to ${spot.name}.`);
            }}
            showPins={true}
            showKde={true}
            showSpeedLimits={false}
            zoom={13}
          />

          {/* Floating Live Telemetry HUD Overlay in Map */}
          {isNavigating && (
            <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-[450] flex justify-center pointer-events-none">
              <TelemetryHUD
                speed={userLoc.speed || 0}
                speedLimit={40}
                heading={userLoc.heading || 0}
                cardinal={userLoc.cardinal || 'NORTH'}
                accuracy={userLoc.accuracy || 8}
                latitude={userLoc.latitude}
                longitude={userLoc.longitude}
                isLiveTracking={true}
                heartbeatTick={heartbeatTick}
                vehicleType={vehicleType}
                onChangeVehicleType={setVehicleType}
                followUser={followCamera}
                onToggleFollowUser={() => setFollowCamera(!followCamera)}
                showBreadcrumbs={showBreadcrumbs}
                onToggleBreadcrumbs={() => setShowBreadcrumbs(!showBreadcrumbs)}
                className="w-full max-w-xl shadow-2xl"
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}