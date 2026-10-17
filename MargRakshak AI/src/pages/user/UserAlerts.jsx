import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MapView from '../../components/MapView';
import { getHotspots } from '../../services/api';
import { getFallbackHotspots, normalizeHotspot } from '../../data/hotspots';
import NotificationToast from '../../components/common/NotificationToast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import HotspotDetailsModal from '../../components/common/HotspotDetailsModal';
import TelemetryHUD from '../../components/common/TelemetryHUD';
import { useGeolocation } from '../../hooks/useGeolocation';
import { calculateDistance, calculateBearing, degreeToCardinal, calculateDistanceMeters } from '../../utils/distance';
import { voiceAlert } from '../../utils/voice';
import {
  buildHotspotAlertMessage,
  buildProximityAlertMessage,
  buildSafelyPassedMessage,
  buildReachedDestinationMessage,
  buildKmToDestinationMessage,
  getSpeechLang,
  t,
} from '../../utils/i18n';
import { useLanguage } from '../../context/LanguageContext';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  Milestone,
  CheckCircle2,
  Play,
  Pause,
  Car,
  Gauge,
  RotateCcw,
  LocateFixed,
  Flag,
  Loader2,
  Info,
  Navigation,
} from 'lucide-react';

const ALERT_THRESHOLDS = [1000, 500, 200];

export default function UserAlerts() {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  // Accept real route object passed via router state (selectedRoute from UserRoutes.jsx, liveRoute from UserNavigation.jsx, or generic route)
  const activeRoute =
    routerLocation.state?.selectedRoute ||
    routerLocation.state?.liveRoute ||
    routerLocation.state?.route ||
    null;

  const alternateRoute = routerLocation.state?.alternateRoute || null;
  const destinationLabel =
    routerLocation.state?.destinationLabel ||
    routerLocation.state?.destinationQuery ||
    (typeof routerLocation.state?.destination === 'string' ? routerLocation.state.destination : null) ||
    activeRoute?.label ||
    activeRoute?.name ||
    null;
  const destinationCoords =
    routerLocation.state?.destinationCoords ||
    (typeof routerLocation.state?.destination === 'object' && routerLocation.state.destination?.lat
      ? routerLocation.state.destination
      : null);
  const passedVoiceState = routerLocation.state?.voiceOn || false;
  const { language: globalLang } = useLanguage();
  const alertLang = routerLocation.state?.alertLang || globalLang || 'en';
  const speechLang = getSpeechLang(alertLang);

  // Every on-screen label on this page follows the driver's chosen alert
  // language (set at login / in Profile) — same language the voice alerts speak in.
  const tt = (key) => t(key, alertLang);

  // Live tracking mode is active when a real road route is present and not explicitly set to demo
  const isLiveMode = Boolean(activeRoute && !routerLocation.state?.isDemo);

  // ---------- BACKEND HOTSPOTS DATA SOURCE ----------
  const [hotspots, setHotspots] = useState(getFallbackHotspots);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isFallbackHotspots, setIsFallbackHotspots] = useState(false);

  const fetchHotspotData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await getHotspots({ limit: 200 });
      const rawList = res?.items || (Array.isArray(res) ? res : []);
      if (rawList.length > 0) {
        const normalized = rawList.map(normalizeHotspot);
        setHotspots(normalized);
        setIsFallbackHotspots(false);
        setFetchError(null);
      } else {
        setHotspots(getFallbackHotspots());
        setIsFallbackHotspots(true);
      }
    } catch (err) {
      console.warn('Error fetching backend hotspots in UserAlerts, falling back to mock dataset:', err);
      setHotspots(getFallbackHotspots());
      setIsFallbackHotspots(true);
      setFetchError(err.message || 'API connection failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotspotData();
  }, [fetchHotspotData]);

  // ---------- LIVE MODE: real GPS tracking along a real road route ----------
  const { location: userLoc, status: locationStatus, heartbeatTick } = useGeolocation(isLiveMode);
  const [currentRoute, setCurrentRoute] = useState(activeRoute);
  const [rerouted, setRerouted] = useState(false);
  const [hotspotStates, setHotspotStates] = useState(
    () => (activeRoute?.hotspotsEnRoute || []).map((h) => ({ ...h, passed: false }))
  );
  const [arrived, setArrived] = useState(false);
  const alertedThresholds = useRef({}); // { [hotspotName]: Set(thresholds already spoken) }

  // Sync active route if router state changes
  useEffect(() => {
    if (activeRoute) {
      setCurrentRoute(activeRoute);
    }
  }, [activeRoute]);

  // Re-sync hotspot list whenever the active route or fetched hotspots change
  useEffect(() => {
    if (!isLiveMode || !currentRoute) return;
    const baseList = (currentRoute?.hotspotsEnRoute && currentRoute.hotspotsEnRoute.length > 0)
      ? currentRoute.hotspotsEnRoute
      : hotspots;
    setHotspotStates(baseList.map((h) => ({ ...h, passed: false })));
    alertedThresholds.current = {};
    setArrived(false);
  }, [currentRoute, isLiveMode, hotspots]);

  const nearestActive = useMemo(() => {
    if (!isLiveMode || !activeRoute) return null;
    let nearest = null;
    let nearestDist = Infinity;
    for (const h of hotspotStates) {
      if (h.passed || h.lat == null || h.lng == null) continue;
      const distM = calculateDistance({ lat: userLoc.latitude, lng: userLoc.longitude }, { lat: h.lat, lng: h.lng }) * 1000;
      if (distM < nearestDist) {
        nearestDist = distM;
        nearest = h;
      }
    }
    return nearest ? { hotspot: nearest, distanceMeters: Math.round(nearestDist) } : null;
  }, [hotspotStates, userLoc.latitude, userLoc.longitude, isLiveMode, activeRoute]);

  const distanceToDestinationMeters = useMemo(() => {
    if (!isLiveMode || !destinationCoords) return null;
    return Math.round(
      calculateDistance(
        { lat: userLoc.latitude, lng: userLoc.longitude },
        { lat: destinationCoords.lat, lng: destinationCoords.lng }
      ) * 1000
    );
  }, [isLiveMode, destinationCoords, userLoc.latitude, userLoc.longitude]);

  const [voiceMuted, setVoiceMuted] = useState(!passedVoiceState);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ---------- SIMULATION / DEMO MODE (when requested with an active route) ----------
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoDistance, setDemoDistance] = useState(500);
  const [demoSpeed, setDemoSpeed] = useState(65);
  const [demoSpeedLimit, setDemoSpeedLimit] = useState(40);
  const [demoRerouted, setDemoRerouted] = useState(false);
  const [simCoordIndex, setSimCoordIndex] = useState(0);
  const [simLocation, setSimLocation] = useState(null);
  const [simHeartbeatTick, setSimHeartbeatTick] = useState(0);
  const [vehicleType, setVehicleType] = useState(() => routerLocation.state?.vehicleType || 'car');
  const [followUser, setFollowUser] = useState(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const demoInterval = useRef(null);
  const demoCooldown = useRef(false);

  const vehicleColor = vehicleType === 'bike' ? '#10B981' : (vehicleType === 'emergency' ? '#EF4444' : '#2563EB');

  // Use the real passed route object directly instead of looking up in mockRoutes
  const demoRouteData = useMemo(() => {
    if (!activeRoute) return null;
    if (demoRerouted && alternateRoute) return alternateRoute;
    return activeRoute;
  }, [demoRerouted, alternateRoute, activeRoute]);

  // Identify whichever real backend hotspot comes closest to the active route path
  const demoActiveHotspot = useMemo(() => {
    if (!hotspots || hotspots.length === 0 || !demoRouteData?.path) return null;
    let bestHotspot = null;
    let minDistance = Infinity;

    for (const h of hotspots) {
      if (h.lat == null || h.lng == null) continue;
      for (const pt of demoRouteData.path) {
        const d = calculateDistance({ lat: pt[0], lng: pt[1] }, { lat: h.lat, lng: h.lng }) * 1000;
        if (d < minDistance) {
          minDistance = d;
          bestHotspot = h;
        }
      }
    }
    return bestHotspot ? { ...bestHotspot, minRouteDistMeters: Math.round(minDistance) } : hotspots[0];
  }, [hotspots, demoRouteData]);

  // Look up the full hotspot record for the details modal
  const detailsHotspot = useMemo(() => {
    if (isLiveMode) {
      if (!nearestActive) return null;
      const full = hotspots.find(
        (h) => (h.id != null && h.id === nearestActive.hotspot.id) || h.name === nearestActive.hotspot.name
      );
      return full || nearestActive.hotspot;
    }
    return demoActiveHotspot || null;
  }, [isLiveMode, nearestActive, demoActiveHotspot, hotspots]);

  // Fire voice + toast alerts as the live GPS position crosses 1000m / 500m / 200m
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    if (!isLiveMode || !nearestActive) return;
    const { hotspot, distanceMeters } = nearestActive;
    const key = hotspot.name;
    if (!alertedThresholds.current[key]) alertedThresholds.current[key] = new Set();
    const spoken = alertedThresholds.current[key];

    // Hysteresis: once the driver is well clear of the outermost threshold,
    // forget which alerts were already spoken so the same hotspot can alert
    // again if they loop back and approach it a second time.
    if (distanceMeters > ALERT_THRESHOLDS[0] + 50 && spoken.size > 0) {
      spoken.clear();
    }

    for (const threshold of ALERT_THRESHOLDS) {
      if (distanceMeters <= threshold && !spoken.has(threshold)) {
        spoken.add(threshold);
        const msg = buildProximityAlertMessage(alertLang, threshold);
        if (!voiceMuted) voiceAlert.speak(msg, speechLang);
        setToastType(threshold <= 200 ? 'warning' : threshold <= 500 ? 'warning' : 'info');
        setToastMessage(msg);
      }
    }

    // Consider it "passed" once the driver gets very close (proximity radius)
    if (distanceMeters <= 40) {
      setHotspotStates((prev) => prev.map((h) => (h.name === hotspot.name ? { ...h, passed: true } : h)));
      setToastType('success');
      setToastMessage(buildSafelyPassedMessage(alertLang, hotspot.name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearestActive, isLiveMode, voiceMuted]);

  // Arrival detection
  useEffect(() => {
    if (!isLiveMode || arrived) return;
    if (distanceToDestinationMeters !== null && distanceToDestinationMeters <= 40) {
      setArrived(true);
      setToastType('success');
      setToastMessage(t('arrived', alertLang));
      if (!voiceMuted) voiceAlert.speak(t('arrived', alertLang), speechLang);
    }
  }, [distanceToDestinationMeters, isLiveMode, arrived, voiceMuted, alertLang, speechLang]);

  const handleReroute = () => {
    if (!alternateRoute || alternateRoute === currentRoute) {
      setToastType('info');
      setToastMessage(tt('noAlternateRoute'));
      return;
    }
    setCurrentRoute(alternateRoute);
    setRerouted(true);
    setToastType('success');
    setToastMessage(tt('switchedAlternateRoute'));
    if (!voiceMuted) voiceAlert.speak(t('rerouting', alertLang), speechLang);
  };

  const handleMuteToggle = () => {
    const nextMute = !voiceMuted;
    setVoiceMuted(nextMute);
    voiceAlert.setMute(nextMute);
    setToastType('info');
    setToastMessage(nextMute ? tt('voiceMuted') : tt('voiceUnmuted'));
    if (!nextMute) voiceAlert.speak(t('voiceWarningsActive', alertLang), speechLang);
  };

  useEffect(() => {
    if (isLiveMode) return;
    setDemoSpeedLimit(demoRerouted ? 60 : 40);
  }, [demoRerouted, isLiveMode]);

  useEffect(() => {
    if (isLiveMode || voiceMuted || demoRerouted || !demoActiveHotspot) return;
    if (demoDistance === 300 && !demoCooldown.current) {
      voiceAlert.speak(
        buildHotspotAlertMessage(
          alertLang,
          demoActiveHotspot.riskLevel || 'HIGH',
          demoActiveHotspot.name,
          300
        ),
        speechLang
      );
      demoCooldown.current = true;
      setTimeout(() => (demoCooldown.current = false), 1500);
    } else if (demoDistance === 100 && !demoCooldown.current) {
      voiceAlert.speak(
        t(demoSpeed > demoSpeedLimit ? 'speedViolation' : 'enteringHotspot', alertLang),
        speechLang
      );
      demoCooldown.current = true;
      setTimeout(() => (demoCooldown.current = false), 1500);
    }
  }, [demoDistance, voiceMuted, demoSpeed, demoSpeedLimit, demoRerouted, isLiveMode, demoActiveHotspot, alertLang, speechLang]);

  // High-frequency simulation engine along route coordinates
  useEffect(() => {
    if (isLiveMode) return;
    if (!isPlaying) {
      if (demoInterval.current) clearInterval(demoInterval.current);
      return;
    }

    const path = demoRouteData?.path;
    if (!path || path.length < 2) return;

    demoInterval.current = setInterval(() => {
      setSimCoordIndex((prevIdx) => {
        const nextIdx = prevIdx + 1;
        if (nextIdx >= path.length) {
          setIsPlaying(false);
          setToastType('success');
          setToastMessage(t('arrived', alertLang));
          if (!voiceMuted) voiceAlert.speak(t('arrived', alertLang), speechLang);
          return prevIdx;
        }

        const curr = path[prevIdx];
        const next = path[nextIdx];
        const bearing = calculateBearing(curr[0], curr[1], next[0], next[1]);
        const cardinal = degreeToCardinal(bearing);

        setSimLocation({
          latitude: curr[0],
          longitude: curr[1],
          speed: demoSpeed,
          heading: bearing,
          cardinal,
          accuracy: 5,
          timestamp: Date.now(),
          isHighAccuracy: true
        });
        setSimHeartbeatTick((t) => (t + 1) % 10000);

        if (demoActiveHotspot && demoActiveHotspot.lat != null) {
          const dM = Math.round(calculateDistance({ lat: curr[0], lng: curr[1] }, { lat: demoActiveHotspot.lat, lng: demoActiveHotspot.lng }) * 1000);
          setDemoDistance(dM);
        }

        return nextIdx;
      });
    }, 180);

    return () => clearInterval(demoInterval.current);
  }, [isPlaying, isLiveMode, demoRouteData, demoSpeed, demoActiveHotspot, voiceMuted, alertLang, speechLang]);

  const handleDemoReroute = () => {
    setDemoRerouted(true);
    setIsPlaying(false);
    setSimCoordIndex(0);
    setDemoDistance(600);
    setToastType('success');
    setToastMessage(tt('altRouteSelected'));
    if (!voiceMuted) voiceAlert.speak(t('rerouting', alertLang), speechLang);
  };

  const demoIsSpeedViolation = demoSpeed > demoSpeedLimit;

  // ---------- Shared derived display values ----------
  const headerRouteLabel = activeRoute
    ? (isLiveMode
        ? `${destinationLabel ? `${tt('toDestinationPrefix')} ${destinationLabel.split(',')[0]}` : activeRoute.label || activeRoute.name || tt('liveRouteLabel')}`
        : (demoRouteData?.label || demoRouteData?.name || activeRoute.label || activeRoute.name))
    : 'No Active Route';

  const mapUserLocation = isLiveMode
    ? userLoc
    : (simLocation || (demoRouteData?.path?.length
        ? {
            latitude: demoRouteData.path[0][0],
            longitude: demoRouteData.path[0][1],
            speed: demoSpeed,
            heading: 0,
            cardinal: 'NORTH',
            accuracy: 5,
            isHighAccuracy: true
          }
        : userLoc));

  const mapSelectedRoute = isLiveMode ? currentRoute : demoRouteData;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {toastMessage && (
        <NotificationToast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}

      <HotspotDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        hotspot={detailsHotspot}
        distanceMeters={isLiveMode && nearestActive ? nearestActive.distanceMeters : null}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">
              {!activeRoute ? 'Route Standby' : isLiveMode ? tt('liveGpsTrip') : tt('inTransitHud')}
            </span>
            <span className="text-gray-300 dark:text-uber-borderDark">•</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              !activeRoute
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800/40'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/40'
            }`}>
              {!activeRoute ? 'No Active Route' : isLiveMode ? (locationStatus === 'active' ? tt('gpsLocked') : tt('locatingLabel')) : tt('activeMonitoring')}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-uber-text dark:text-white tracking-tight">
            {!activeRoute ? 'Safety Alert Hub' : isLiveMode ? tt('liveNavTitle') : tt('demoNavTitle')}
          </h1>
          <p className="text-sm text-uber-muted dark:text-uber-mutedDark mt-1">
            {!activeRoute
              ? 'Select a route from the Routes page to start live hazard monitoring and proximity warnings.'
              : isLiveMode ? tt('liveNavDesc') : tt('demoNavDesc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={activeRoute ? 'neutral' : 'warning'}>
            <Car className="w-3.5 h-3.5 mr-1" />
            {headerRouteLabel}
          </Badge>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
          <span className="font-semibold">Loading real-time accident hotspots from backend database...</span>
        </div>
      )}

      {/* Live Data Badge */}
      {!isLoading && !isFallbackHotspots && !fetchError && (
        <div className="flex items-center justify-between p-2.5 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 w-full max-w-xl">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">
              Live Hotspot Database Connected ({hotspots.length} active Nashik blackspots)
            </span>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Live
          </span>
        </div>
      )}

      {/* Fallback Notice Badge with Retry */}
      {!isLoading && isFallbackHotspots && !fetchError && (
        <div className="flex items-center justify-between gap-2 p-2.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 w-fit">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Offline Fallback Active: Using verified 102 Nashik accident blackspots dataset</span>
          </div>
          <button
            type="button"
            onClick={fetchHotspotData}
            className="flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline cursor-pointer ml-3 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry Live
          </button>
        </div>
      )}

      {/* API Error State */}
      {!isLoading && fetchError && (
        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-300 w-full max-w-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>Hotspot API Notice: {fetchError}. Offline fallback dataset active.</span>
          </div>
          <button
            type="button"
            onClick={fetchHotspotData}
            className="flex items-center gap-1 font-semibold text-red-700 dark:text-red-300 hover:underline cursor-pointer ml-3 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry API
          </button>
        </div>
      )}

      {/* Top Console */}
      <div className="bg-black text-white p-4 md:p-5 rounded-2xl shadow-elevated border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-75 ${isLiveMode ? 'bg-amber-400' : isPlaying ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isLiveMode ? 'bg-amber-400' : isPlaying ? 'bg-red-500' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <LocateFixed className="w-3 h-3" /> {tt('gpsTelemetryFeed')}
            </div>
            <div className="text-sm font-bold flex items-center gap-2">
              {isLiveMode ? (
                <span>
                  {locationStatus === 'active'
                    ? `Lat ${userLoc.latitude.toFixed(5)}, Lng ${userLoc.longitude.toFixed(5)}`
                    : locationStatus === 'error'
                    ? tt('permissionDeniedLocation')
                    : tt('waitingForGpsFix')}
                </span>
              ) : activeRoute ? (
                <span>{isPlaying ? tt('autonomousDriveActive') : tt('simulationPaused')}</span>
              ) : (
                <span>Standby — Ready for Trip</span>
              )}
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-xs text-gray-300 font-mono">Nashik Grid</span>
            </div>
          </div>
        </div>

        {/* Manual controls only make sense in demo mode WITH an active route */}
        {!isLiveMode && activeRoute && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-full p-1 pl-3">
              <Milestone className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-300 font-mono font-bold pr-1">{demoDistance}m</span>
              <div className="flex items-center gap-1">
                {[500, 300, 200, 100, 50].map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDemoDistance(d);
                      setIsPlaying(false);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition font-mono ${
                      demoDistance === d ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full py-1.5 px-3.5 text-xs">
              <Gauge className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-200 font-mono font-bold whitespace-nowrap">{demoSpeed} km/h</span>
              <input
                type="range"
                min="30"
                max="85"
                value={demoSpeed}
                onChange={(e) => setDemoSpeed(parseInt(e.target.value))}
                className="w-20 accent-white h-1 cursor-pointer"
              />
            </div>

            <Button variant={isPlaying ? 'secondary' : 'accent'} size="sm" onClick={() => setIsPlaying(!isPlaying)} className="rounded-full">
              {isPlaying ? (<><Pause className="w-3.5 h-3.5 mr-1" /> {tt('pauseLabel')}</>) : (<><Play className="w-3.5 h-3.5 mr-1 fill-current" /> {tt('autoDrive')}</>)}
            </Button>
          </div>
        )}

        {(isLiveMode || !activeRoute) && (
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full py-1.5 px-3.5 text-xs">
            <Gauge className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-200 font-mono font-bold whitespace-nowrap">{userLoc.speed || 0} km/h (GPS)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
          {!activeRoute ? (
            <Card className="border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-uber-text dark:text-white">
                    No Active Route Selected
                  </h3>
                  <p className="text-xs text-uber-muted dark:text-uber-mutedDark mt-1 leading-relaxed">
                    To receive real-time proximity alerts, voice warnings, and accident hotspot buffers along your corridor, please select a destination and choose a route.
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/user/routes')}
                className="w-full justify-center py-3 font-semibold"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Select a Route
              </Button>
            </Card>
          ) : isLiveMode ? (
            arrived ? (
              <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">{tt('tripComplete')}</span>
                    <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">{tt('youveArrived')}</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {buildReachedDestinationMessage(alertLang, destinationLabel || tt('yourDestination'))}
                </p>
              </Card>
            ) : nearestActive ? (
              <div
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  nearestActive.distanceMeters <= 200
                    ? 'bg-red-500/10 border-red-500 text-red-950 dark:text-red-200 shadow-glow-accent animate-pulse'
                    : nearestActive.distanceMeters <= 500
                    ? 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-200 shadow-card'
                    : 'bg-yellow-500/10 border-yellow-400 text-yellow-950 dark:text-yellow-200 shadow-card'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${nearestActive.distanceMeters <= 200 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">{tt('hazardProximityHud')}</span>
                      <span className="text-sm font-extrabold tracking-tight">
                        {nearestActive.distanceMeters <= 200 ? tt('criticalBrakingAlert') : tt('hotspotImminent')}
                      </span>
                    </div>
                  </div>
                  <Badge variant={nearestActive.distanceMeters <= 200 ? 'danger' : 'warning'} size="sm">
                    {nearestActive.distanceMeters}m
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold block uppercase text-uber-muted dark:text-uber-mutedDark">{tt('identifiedHotspot')}</span>
                  <span className="text-lg font-black text-uber-text dark:text-white">{nearestActive.hotspot.name}</span>
                  <p className="text-xs mt-1 opacity-80">
                    {buildProximityAlertMessage(alertLang, nearestActive.distanceMeters <= 200 ? 200 : nearestActive.distanceMeters <= 500 ? 500 : 1000)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(true)}
                  className="mt-4 w-full text-xs font-bold py-2 rounded-lg bg-white/70 dark:bg-black/20 border border-current/20 hover:bg-white transition-colors"
                >
                  {tt('viewHotspotDetails')}
                </button>
              </div>
            ) : (
              <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">{tt('routeClear')}</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {tt('noHotspotsAhead')}
                  {distanceToDestinationMeters !== null && ` ${buildKmToDestinationMessage(alertLang, (distanceToDestinationMeters / 1000).toFixed(1))}`}
                </p>
              </Card>
            )
          ) : (
            isLoading ? (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                <span className="text-sm font-bold text-uber-text dark:text-white">Connecting to Hotspot Grid...</span>
              </div>
              <p className="text-xs text-uber-muted dark:text-uber-mutedDark">
                Fetching verified accident locations from database.
              </p>
            </Card>
          ) : fetchError ? (
            <Card className="p-6 border-red-200 dark:border-red-800/40 bg-red-50/40 dark:bg-red-950/20">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm font-bold text-red-900 dark:text-red-200">Hotspot Fetch Error</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                {fetchError}
              </p>
              <Button size="sm" variant="accent" onClick={fetchHotspotData}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry
              </Button>
            </Card>
          ) : !demoRerouted ? (
            demoActiveHotspot ? (
              <div
                className={`p-6 rounded-2xl border transition-all duration-300 ${
                  demoDistance <= 100
                    ? 'bg-red-500/10 border-red-500 text-red-950 dark:text-red-200 shadow-glow-accent animate-pulse'
                    : demoDistance <= 300
                    ? 'bg-amber-500/10 border-amber-500 text-amber-950 dark:text-amber-200 shadow-card'
                    : 'bg-yellow-500/10 border-yellow-400 text-yellow-950 dark:text-yellow-200 shadow-card'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${demoDistance <= 100 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">{tt('hazardProximityHud')}</span>
                      <span className="text-sm font-extrabold tracking-tight">
                        {demoDistance <= 100 ? tt('criticalBrakingAlert') : tt('hotspotImminent')}
                      </span>
                    </div>
                  </div>
                  <Badge variant={demoDistance <= 100 ? 'danger' : 'warning'} size="sm">{demoDistance}m</Badge>
                </div>
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-xs font-semibold block uppercase text-uber-muted dark:text-uber-mutedDark">{tt('identifiedHotspot')}</span>
                    <span className="text-lg font-black text-uber-text dark:text-white">{demoActiveHotspot.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/70 dark:bg-uber-dark/70 border border-gray-200/50 dark:border-uber-borderDark/50 text-xs">
                    <span className="font-bold block text-uber-text dark:text-white mb-0.5">{tt('contributingHazards')}</span>
                    <p className="text-uber-muted dark:text-uber-mutedDark">
                      {demoActiveHotspot.safetyRecommendation || (Array.isArray(demoActiveHotspot.riskFactors) && demoActiveHotspot.riskFactors.length > 0 ? demoActiveHotspot.riskFactors.join(' • ') : tt('contributingHazardsDesc'))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="mt-3 w-full text-xs font-bold py-2 rounded-lg bg-white/70 dark:bg-black/20 border border-current/20 hover:bg-white transition-colors"
                  >
                    {tt('viewHotspotDetails')}
                  </button>
                </div>
              </div>
            ) : (
              <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">{tt('routeClear')}</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {tt('noHotspotsAhead')}
                </p>
              </Card>
            )
          ) : (
            <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">{tt('dynamicRerouteActive')}</span>
                  <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">{tt('safeTrajectoryEngaged')}</span>
                </div>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                {demoActiveHotspot
                  ? (alertLang === 'hi'
                    ? `${demoActiveHotspot.name} के खतरे वाले क्षेत्र को सफलतापूर्वक बायपास किया गया।`
                    : alertLang === 'mr'
                    ? `${demoActiveHotspot.name} चे धोक्याचे क्षेत्र यशस्वीरित्या बायपास केले.`
                    : `Successfully bypassed the ${demoActiveHotspot.name} hazard zone. Traversing alternate road corridor with optimal clearance.`)
                  : tt('bypassedDwarkaDesc')}
              </p>
            </Card>
          )
        )}

        {/* Speedometer Card */}
        <Card title={tt('speedometerTitle')} subtitle={isLiveMode ? tt('liveGpsSpeedReading') : tt('radarSpeedBuffer')} action={<Gauge className="w-4 h-4 text-uber-muted" />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                !isLiveMode && demoIsSpeedViolation ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-900/60' : 'bg-gray-50/80 dark:bg-uber-dark border-gray-100 dark:border-uber-borderDark'
              }`}>
                <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase">{tt('yourVelocity')}</span>
                <span className={`text-2xl font-black my-1 ${!isLiveMode && demoIsSpeedViolation ? 'text-red-600 dark:text-red-400' : 'text-uber-text dark:text-white'}`}>
                  {isLiveMode ? (userLoc.speed || 0) : demoSpeed} <span className="text-xs font-normal">km/h</span>
                </span>
                {!isLiveMode && (
                  <div className="text-[11px] font-bold">
                    {demoIsSpeedViolation ? (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{tt('violationLabel')}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{tt('normalLabel')}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark flex flex-col justify-between">
                <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase">
                  {isLiveMode ? tt('distanceToDestination') : tt('safeZoneLimit')}
                </span>
                <span className="text-2xl font-black my-1 text-uber-text dark:text-white">
                  {isLiveMode
                    ? distanceToDestinationMeters !== null
                      ? `${(distanceToDestinationMeters / 1000).toFixed(1)}`
                      : currentRoute?.distance?.replace(' km', '') || '—'
                    : activeRoute
                    ? demoSpeedLimit
                    : '—'}{' '}
                  <span className="text-xs font-normal">{isLiveMode ? 'km' : activeRoute ? 'km/h' : ''}</span>
                </span>
                <div className="text-[11px] font-medium text-uber-muted dark:text-uber-mutedDark">
                  {isLiveMode
                    ? (rerouted ? tt('alternateRouteLabel') : tt('originalRouteLabel'))
                    : activeRoute
                    ? (rerouted ? tt('arterialLimit') : tt('hotspotThreshold'))
                    : 'Awaiting Route Selection'}
                </div>
              </div>
            </div>
            {!isLiveMode && activeRoute && demoIsSpeedViolation && (
              <div className="p-3 rounded-xl bg-red-600 text-white text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{tt('speedLimitExceeded')}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Controls */}
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <Button variant={voiceMuted ? 'secondary' : 'outline'} size="md" onClick={handleMuteToggle} className="justify-center">
              {voiceMuted ? <VolumeX className="w-4 h-4 mr-1.5" /> : <Volume2 className="w-4 h-4 mr-1.5" />}
              {voiceMuted ? tt('unmuteVoice') : tt('muteVoice')}
            </Button>
            <Button
              variant="accent"
              size="md"
              onClick={isLiveMode ? handleReroute : handleDemoReroute}
              disabled={!activeRoute || (isLiveMode ? rerouted || !alternateRoute : demoRerouted)}
              className="justify-center"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {(isLiveMode ? rerouted : demoRerouted) ? tt('reroutedLabel') : tt('reroutePath')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Right Column: Telemetry HUD + Live Map */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <TelemetryHUD
          speed={mapUserLocation?.speed || 0}
          speedLimit={isLiveMode ? (nearestActive?.hotspot?.speedLimit || 50) : demoSpeedLimit}
          heading={mapUserLocation?.heading || 0}
          cardinal={mapUserLocation?.cardinal || 'NORTH'}
          accuracy={mapUserLocation?.accuracy || 8}
          latitude={mapUserLocation?.latitude || 20.0084}
          longitude={mapUserLocation?.longitude || 73.7635}
          isLiveTracking={isLiveMode}
          heartbeatTick={isLiveMode ? heartbeatTick : simHeartbeatTick}
          vehicleType={vehicleType}
          onChangeVehicleType={setVehicleType}
          followUser={followUser}
          onToggleFollowUser={() => setFollowUser(!followUser)}
        />
        <div className="h-[300px] sm:h-[420px] lg:h-[580px] flex flex-col rounded-2xl overflow-hidden border border-gray-200/80 dark:border-uber-borderDark shadow-card relative">
          <MapView
            hotspots={hotspots}
            selectedRoute={mapSelectedRoute}
            routes={alternateRoute ? [alternateRoute, mapSelectedRoute].filter(Boolean) : (mapSelectedRoute ? [mapSelectedRoute] : [])}
            userLocation={mapUserLocation}
            vehicleType={vehicleType}
            vehicleColor={vehicleColor}
            followUser={followUser}
            enableSmoothLerp={true}
            showPins={true}
            showKde={true}
            showSpeedLimits={true}
            zoom={15}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
