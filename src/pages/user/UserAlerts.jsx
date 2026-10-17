import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MapView from '../../components/MapView';
import { mockHotspots } from '../../data/hotspots';
import { mockRoutes } from '../../data/routes';
import NotificationToast from '../../components/common/NotificationToast';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useGeolocation } from '../../hooks/useGeolocation';
import { calculateDistance } from '../../utils/distance';
import { voiceAlert } from '../../utils/voice';
import { buildHotspotAlertMessage, getSpeechLang, t } from '../../utils/i18n';
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
} from 'lucide-react';

const ALERT_THRESHOLDS = [1000, 500, 200];

export default function UserAlerts() {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const liveRoute = routerLocation.state?.liveRoute || null;
  const alternateRoute = routerLocation.state?.alternateRoute || null;
  const destinationLabel = routerLocation.state?.destinationLabel || null;
  const destinationCoords = routerLocation.state?.destinationCoords || null;
  const passedVoiceState = routerLocation.state?.voiceOn || false;
  const alertLang = routerLocation.state?.alertLang || 'en';
  const speechLang = getSpeechLang(alertLang);

  const isLiveMode = Boolean(liveRoute);

  // ---------- LIVE MODE: real GPS tracking along a real road route ----------
  const { location: userLoc, status: locationStatus } = useGeolocation(isLiveMode);
  const [currentRoute, setCurrentRoute] = useState(liveRoute);
  const [rerouted, setRerouted] = useState(false);
  const [hotspotStates, setHotspotStates] = useState(
    () => (liveRoute?.hotspotsEnRoute || []).map((h) => ({ ...h, passed: false }))
  );
  const [arrived, setArrived] = useState(false);
  const alertedThresholds = useRef({}); // { [hotspotName]: Set(thresholds already spoken) }

  // Re-sync hotspot list whenever the active route changes (e.g. after reroute)
  useEffect(() => {
    if (!isLiveMode) return;
    setHotspotStates((currentRoute?.hotspotsEnRoute || []).map((h) => ({ ...h, passed: false })));
    alertedThresholds.current = {};
    setArrived(false);
  }, [currentRoute, isLiveMode]);

  const nearestActive = useMemo(() => {
    if (!isLiveMode) return null;
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
  }, [hotspotStates, userLoc.latitude, userLoc.longitude, isLiveMode]);

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

  // Fire voice + toast alerts as the live GPS position crosses 1000m / 500m / 200m
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    if (!isLiveMode || !nearestActive) return;
    const { hotspot, distanceMeters } = nearestActive;
    const key = hotspot.name;
    if (!alertedThresholds.current[key]) alertedThresholds.current[key] = new Set();
    const spoken = alertedThresholds.current[key];

    for (const threshold of ALERT_THRESHOLDS) {
      if (distanceMeters <= threshold && !spoken.has(threshold)) {
        spoken.add(threshold);
        const msg = buildHotspotAlertMessage(alertLang, hotspot.risk, hotspot.name, threshold);
        if (!voiceMuted) voiceAlert.speak(msg, speechLang);
        setToastType(threshold <= 200 ? 'warning' : 'info');
        setToastMessage(`${hotspot.name} is ${threshold}m ahead — ${hotspot.risk} risk zone.`);
      }
    }

    // Consider it "passed" once the driver gets very close (proximity radius)
    if (distanceMeters <= 40) {
      setHotspotStates((prev) => prev.map((h) => (h.name === hotspot.name ? { ...h, passed: true } : h)));
      setToastType('success');
      setToastMessage(`Safely passed ${hotspot.name}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearestActive, isLiveMode, voiceMuted]);

  // Arrival detection
  useEffect(() => {
    if (!isLiveMode || arrived) return;
    if (distanceToDestinationMeters !== null && distanceToDestinationMeters <= 40) {
      setArrived(true);
      setToastType('success');
      setToastMessage('You have arrived at your destination!');
      if (!voiceMuted) voiceAlert.speak(t('arrived', alertLang), speechLang);
    }
  }, [distanceToDestinationMeters, isLiveMode, arrived, voiceMuted]);

  const handleReroute = () => {
    if (!alternateRoute || alternateRoute === currentRoute) {
      setToastType('info');
      setToastMessage('No alternate road route is available for this trip.');
      return;
    }
    setCurrentRoute(alternateRoute);
    setRerouted(true);
    setToastType('success');
    setToastMessage('Switched to the alternate route.');
    if (!voiceMuted) voiceAlert.speak(t('rerouting', alertLang), speechLang);
  };

  const handleMuteToggle = () => {
    const nextMute = !voiceMuted;
    setVoiceMuted(nextMute);
    voiceAlert.setMute(nextMute);
    setToastType('info');
    setToastMessage(nextMute ? 'Voice safety warnings muted.' : 'Voice safety warnings unmuted.');
    if (!nextMute) voiceAlert.speak(t('voiceWarningsActive', alertLang), speechLang);
  };

  // ---------- LEGACY / DEMO MODE (no live route in state) ----------
  const passedRouteId = routerLocation.state?.routeId || 3;
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoDistance, setDemoDistance] = useState(500);
  const [demoSpeed, setDemoSpeed] = useState(65);
  const [demoSpeedLimit, setDemoSpeedLimit] = useState(40);
  const [demoRerouted, setDemoRerouted] = useState(false);
  const demoInterval = useRef(null);
  const demoCooldown = useRef(false);
  const demoActiveHotspot = mockHotspots[0];

  useEffect(() => {
    if (isLiveMode) return;
    setDemoSpeedLimit(demoRerouted ? 60 : 40);
  }, [demoRerouted, isLiveMode]);

  useEffect(() => {
    if (isLiveMode || voiceMuted || demoRerouted) return;
    if (demoDistance === 300 && !demoCooldown.current) {
      voiceAlert.speak(buildHotspotAlertMessage(alertLang, 'HIGH', 'Dwarka Circle', 300), speechLang);
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
  }, [demoDistance, voiceMuted, demoSpeed, demoSpeedLimit, demoRerouted, isLiveMode]);

  useEffect(() => {
    if (isLiveMode) return;
    if (isPlaying) {
      demoInterval.current = setInterval(() => {
        setDemoDistance((prev) => {
          if (prev <= 50) {
            setIsPlaying(false);
            setToastType('warning');
            setToastMessage('You have safely passed through the Dwarka Circle intersection.');
            return 500;
          }
          return prev - 50;
        });
      }, 2000);
    } else {
      clearInterval(demoInterval.current);
    }
    return () => clearInterval(demoInterval.current);
  }, [isPlaying, isLiveMode]);

  const handleDemoReroute = () => {
    setDemoRerouted(true);
    setIsPlaying(false);
    setDemoDistance(600);
    setToastType('success');
    setToastMessage('Alternative safer route selected! Rerouting via Canada Corner & Sharanpur Road.');
    if (!voiceMuted) voiceAlert.speak(t('rerouting', alertLang), speechLang);
  };

  const demoRouteData = demoRerouted ? mockRoutes[0] : mockRoutes[passedRouteId - 1];
  const demoIsSpeedViolation = demoSpeed > demoSpeedLimit;

  // ---------- Shared derived display values ----------
  const headerRouteLabel = isLiveMode
    ? `${destinationLabel ? `To ${destinationLabel.split(',')[0]}` : 'Live Route'}`
    : demoRouteData.label;

  const mapUserLocation = isLiveMode ? userLoc : {
    latitude: demoRouteData.path[Math.max(0, demoRouteData.path.length - 2 - Math.floor(demoDistance / 150))][0],
    longitude: demoRouteData.path[Math.max(0, demoRouteData.path.length - 2 - Math.floor(demoDistance / 150))][1],
    speed: demoSpeed,
  };

  const mapSelectedRoute = isLiveMode ? currentRoute : demoRouteData;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {toastMessage && (
        <NotificationToast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">
              {isLiveMode ? 'Live GPS Trip' : 'In-Transit HUD'}
            </span>
            <span className="text-gray-300 dark:text-uber-borderDark">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/40">
              {isLiveMode ? (locationStatus === 'active' ? 'GPS Locked' : 'Locating…') : 'Active Monitoring'}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-uber-text dark:text-white tracking-tight">
            {isLiveMode ? 'Live Navigation & Proximity Alerts' : 'Driver Telemetry & Proximity Alerts'}
          </h1>
          <p className="text-sm text-uber-muted dark:text-uber-mutedDark mt-1">
            {isLiveMode
              ? 'Tracking your real GPS location along the selected road route.'
              : 'Simulating live vehicular GPS telemetry and spatial proximity collision safeguards.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="neutral">
            <Car className="w-3.5 h-3.5 mr-1" />
            {headerRouteLabel}
          </Badge>
        </div>
      </div>

      {/* Top Console */}
      <div className="bg-black text-white p-4 md:p-5 rounded-2xl shadow-elevated border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className={`animate-ping absolute inline-flex h-4 w-4 rounded-full opacity-75 ${isLiveMode ? 'bg-amber-400' : isPlaying ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isLiveMode ? 'bg-amber-400' : isPlaying ? 'bg-red-500' : 'bg-emerald-500'}`} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <LocateFixed className="w-3 h-3" /> GPS Telemetry Feed
            </div>
            <div className="text-sm font-bold flex items-center gap-2">
              {isLiveMode ? (
                <span>
                  {locationStatus === 'active'
                    ? `Lat ${userLoc.latitude.toFixed(5)}, Lng ${userLoc.longitude.toFixed(5)}`
                    : locationStatus === 'error'
                    ? 'Permission denied — showing default location'
                    : 'Waiting for GPS fix…'}
                </span>
              ) : (
                <span>{isPlaying ? 'Autonomous Drive Simulation Active' : 'Simulation Paused'}</span>
              )}
              <span className="text-gray-500 text-xs">•</span>
              <span className="text-xs text-gray-300 font-mono">Nashik Grid</span>
            </div>
          </div>
        </div>

        {/* Manual controls only make sense in demo mode */}
        {!isLiveMode && (
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
              {isPlaying ? (<><Pause className="w-3.5 h-3.5 mr-1" /> Pause</>) : (<><Play className="w-3.5 h-3.5 mr-1 fill-current" /> Auto Drive</>)}
            </Button>
          </div>
        )}

        {isLiveMode && (
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full py-1.5 px-3.5 text-xs">
            <Gauge className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-200 font-mono font-bold whitespace-nowrap">{userLoc.speed || 0} km/h (GPS)</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">
          {isLiveMode ? (
            arrived ? (
              <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Trip Complete</span>
                    <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">You've Arrived</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  You reached {destinationLabel || 'your destination'} safely.
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
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Hazard Proximity HUD</span>
                      <span className="text-sm font-extrabold tracking-tight">
                        {nearestActive.distanceMeters <= 200 ? 'CRITICAL BRAKING ALERT' : 'HOTSPOT IMMINENT'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={nearestActive.distanceMeters <= 200 ? 'danger' : 'warning'} size="sm">
                    {nearestActive.distanceMeters}m
                  </Badge>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold block uppercase text-uber-muted dark:text-uber-mutedDark">Identified Hotspot</span>
                  <span className="text-lg font-black text-uber-text dark:text-white">{nearestActive.hotspot.name}</span>
                  <p className="text-xs mt-1 opacity-80">{nearestActive.hotspot.risk} risk zone — drive with caution.</p>
                </div>
              </div>
            ) : (
              <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">Route Clear</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  No known accident hotspots remain ahead on this route.
                  {distanceToDestinationMeters !== null && ` ${(distanceToDestinationMeters / 1000).toFixed(1)} km to destination.`}
                </p>
              </Card>
            )
          ) : (
            !demoRerouted ? (
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
                      <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Hazard Proximity HUD</span>
                      <span className="text-sm font-extrabold tracking-tight">
                        {demoDistance <= 100 ? 'CRITICAL BRAKING ALERT' : 'HOTSPOT IMMINENT'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={demoDistance <= 100 ? 'danger' : 'warning'} size="sm">{demoDistance}m</Badge>
                </div>
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-xs font-semibold block uppercase text-uber-muted dark:text-uber-mutedDark">Identified Hotspot</span>
                    <span className="text-lg font-black text-uber-text dark:text-white">{demoActiveHotspot.name}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/70 dark:bg-uber-dark/70 border border-gray-200/50 dark:border-uber-borderDark/50 text-xs">
                    <span className="font-bold block text-uber-text dark:text-white mb-0.5">Contributing Hazards</span>
                    <p className="text-uber-muted dark:text-uber-mutedDark">High speed convergence zone • Merging NH-60 truck traffic • Wet surface advisory</p>
                  </div>
                </div>
              </div>
            ) : (
              <Card className="bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">Dynamic Reroute Active</span>
                    <span className="text-base font-extrabold text-emerald-950 dark:text-emerald-200">Safe Trajectory Engaged</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  Successfully bypassed the critical Dwarka Circle hazard zone. You are now traversing Canada Corner and Sharanpur Road with optimal clearance.
                </p>
              </Card>
            )
          )}

          {/* Speedometer Card */}
          <Card title="Speedometer & Zone Limits" subtitle={isLiveMode ? 'Live GPS speed reading' : 'Radar speed buffer monitoring'} action={<Gauge className="w-4 h-4 text-uber-muted" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                  !isLiveMode && demoIsSpeedViolation ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-900/60' : 'bg-gray-50/80 dark:bg-uber-dark border-gray-100 dark:border-uber-borderDark'
                }`}>
                  <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase">Your Velocity</span>
                  <span className={`text-2xl font-black my-1 ${!isLiveMode && demoIsSpeedViolation ? 'text-red-600 dark:text-red-400' : 'text-uber-text dark:text-white'}`}>
                    {isLiveMode ? (userLoc.speed || 0) : demoSpeed} <span className="text-xs font-normal">km/h</span>
                  </span>
                  {!isLiveMode && (
                    <div className="text-[11px] font-bold">
                      {demoIsSpeedViolation ? <span className="text-red-600 dark:text-red-400">⚠️ Violation</span> : <span className="text-emerald-600 dark:text-emerald-400">🟢 Normal</span>}
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark flex flex-col justify-between">
                  <span className="text-[10px] text-uber-muted dark:text-uber-mutedDark font-bold uppercase">
                    {isLiveMode ? 'Distance to Destination' : 'Safe Zone Limit'}
                  </span>
                  <span className="text-2xl font-black my-1 text-uber-text dark:text-white">
                    {isLiveMode
                      ? distanceToDestinationMeters !== null
                        ? `${(distanceToDestinationMeters / 1000).toFixed(1)}`
                        : currentRoute?.distance?.replace(' km', '') || '—'
                      : demoSpeedLimit}{' '}
                    <span className="text-xs font-normal">{isLiveMode ? 'km' : 'km/h'}</span>
                  </span>
                  <div className="text-[11px] font-medium text-uber-muted dark:text-uber-mutedDark">
                    {isLiveMode ? (rerouted ? 'Alternate route' : 'Original route') : rerouted ? 'Arterial Limit' : 'Hotspot Threshold'}
                  </div>
                </div>
              </div>
              {!isLiveMode && demoIsSpeedViolation && (
                <div className="p-3 rounded-xl bg-red-600 text-white text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>SPEED LIMIT EXCEEDED! PLEASE SLOW DOWN</span>
                </div>
              )}
            </div>
          </Card>

          {/* Controls */}
          <Card>
            <div className="grid grid-cols-2 gap-3">
              <Button variant={voiceMuted ? 'secondary' : 'outline'} size="md" onClick={handleMuteToggle} className="justify-center">
                {voiceMuted ? <VolumeX className="w-4 h-4 mr-1.5" /> : <Volume2 className="w-4 h-4 mr-1.5" />}
                {voiceMuted ? 'Unmute Voice' : 'Mute Voice'}
              </Button>
              <Button
                variant="accent"
                size="md"
                onClick={isLiveMode ? handleReroute : handleDemoReroute}
                disabled={isLiveMode ? rerouted || !alternateRoute : demoRerouted}
                className="justify-center"
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                {(isLiveMode ? rerouted : demoRerouted) ? 'Rerouted' : 'Reroute Path'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Map */}
        <div className="lg:col-span-2 h-[600px] flex flex-col rounded-2xl overflow-hidden border border-gray-200/80 dark:border-uber-borderDark shadow-card">
          <MapView
            hotspots={mockHotspots}
            selectedRoute={mapSelectedRoute}
            userLocation={mapUserLocation}
            showPins={true}
            showKde={true}
            showSpeedLimits={true}
            zoom={15}
          />
        </div>
      </div>
    </div>
  );
}
