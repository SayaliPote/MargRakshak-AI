import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../../components/MapView';
import { mockHotspots } from '../../data/hotspots';
import RiskBadge from '../../components/common/RiskBadge';
import NotificationToast from '../../components/common/NotificationToast';
import { useGeolocation } from '../../hooks/useGeolocation';
import { voiceAlert } from '../../utils/voice';
import { ALERT_LANGUAGES, getSpeechLang, t } from '../../utils/i18n';
import { geocodePlace, reverseGeocode, fetchRoadRoutes } from '../../utils/geocode';
import { findHotspotsNearRoute } from '../../utils/distance';
import {
  MapPin,
  Navigation,
  Volume2,
  VolumeX,
  Play,
  AlertCircle,
  LocateFixed,
  Search,
  Loader2,
} from 'lucide-react';

function buildRouteSummary(rawRoute) {
  const hotspotsEnRoute = findHotspotsNearRoute(rawRoute.path, mockHotspots, 350);
  const hasCritical = hotspotsEnRoute.some((h) => h.riskLevel === 'CRITICAL');
  const hasHigh = hotspotsEnRoute.some((h) => h.riskLevel === 'HIGH');

  let riskLevel = 'LOW';
  let color = '#22C55E';
  if (hasCritical) {
    riskLevel = 'HIGH';
    color = '#EF4444';
  } else if (hasHigh || hotspotsEnRoute.length >= 2) {
    riskLevel = 'MODERATE';
    color = '#EAB308';
  }

  return {
    ...rawRoute,
    distance: `${rawRoute.distanceKm.toFixed(1)} km`,
    time: `${Math.round(rawRoute.durationMin)} mins`,
    riskLevel,
    color,
    totalHotspots: hotspotsEnRoute.length,
    hotspotsEnRoute: hotspotsEnRoute.map((h) => ({
      name: h.name,
      risk: h.riskLevel,
      detail: `${h.distanceToRouteMeters} m from route`,
      lat: h.lat,
      lng: h.lng,
    })),
  };
}

export default function UserNavigation() {
  const navigate = useNavigate();
  const { location: userLoc, status: locationStatus, error: locationError } = useGeolocation(true);

  const [sourceLabel, setSourceLabel] = useState('Fetching your current location…');
  const [destinationQuery, setDestinationQuery] = useState('Nashik Road Railway Station');
  const [destinationCoords, setDestinationCoords] = useState(null);

  const [routeType, setRouteType] = useState('safest'); // safest vs fastest
  const [routeOptions, setRouteOptions] = useState(null); // { safest, fastest }
  const [isSearchingRoute, setIsSearchingRoute] = useState(false);

  const [voiceOn, setVoiceOn] = useState(false);
  const [alertLang, setAlertLang] = useState('en');
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const hasReverseGeocoded = useRef(false);

  const selectedRoute = routeOptions ? routeOptions[routeType] : null;

  // Once we get a real GPS fix, resolve it to a human-readable label
  useEffect(() => {
    if (locationStatus === 'active' && !hasReverseGeocoded.current) {
      hasReverseGeocoded.current = true;
      reverseGeocode(userLoc.latitude, userLoc.longitude).then((label) => {
        setSourceLabel(label || `Your location (${userLoc.latitude.toFixed(4)}, ${userLoc.longitude.toFixed(4)})`);
      });
    } else if (locationStatus === 'error') {
      setSourceLabel(`Location unavailable — using default (${userLoc.latitude.toFixed(4)}, ${userLoc.longitude.toFixed(4)})`);
    } else if (locationStatus === 'locating') {
      setSourceLabel('Fetching your current location…');
    }
  }, [locationStatus, userLoc.latitude, userLoc.longitude]);

  const handleFindRoute = async () => {
    if (!destinationQuery.trim()) {
      setToastType('error');
      setToastMessage('Please enter a destination first.');
      return;
    }

    setIsSearchingRoute(true);
    setRouteOptions(null);

    try {
      const dest = await geocodePlace(
        /nashik/i.test(destinationQuery) ? destinationQuery : `${destinationQuery}, Nashik, Maharashtra, India`
      );
      setDestinationCoords(dest);

      const from = { lat: userLoc.latitude, lng: userLoc.longitude };
      const rawRoutes = await fetchRoadRoutes(from, dest, { alternatives: true });
      const summarized = rawRoutes.map(buildRouteSummary);

      const fastest = [...summarized].sort((a, b) => a.durationMin - b.durationMin)[0];
      const safest = [...summarized].sort(
        (a, b) => a.hotspotsEnRoute.length - b.hotspotsEnRoute.length || a.durationMin - b.durationMin
      )[0];

      setRouteOptions({ safest, fastest: fastest || safest });
      setToastType('success');
      setToastMessage(`Route found via real roads to ${dest.displayName.split(',')[0]}.`);
    } catch (err) {
      setToastType('error');
      setToastMessage(err.message || 'Could not find a route. Please try a different destination.');
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
      setToastMessage('Speech alert active. Safety notices will be read aloud.');
      voiceAlert.speak(t('voiceActivated', alertLang), getSpeechLang(alertLang));
    } else {
      setToastType('info');
      setToastMessage('Speech alert muted.');
      voiceAlert.cancel();
    }
  };

  const handleStartTrip = () => {
    if (!selectedRoute) {
      setToastType('error');
      setToastMessage('Find a route first, then start your trip.');
      return;
    }

    setToastType('success');
    setToastMessage('Trip started! Loading Live Monitor...');

    if (voiceOn) {
      voiceAlert.speak(t('tripStarted', alertLang), getSpeechLang(alertLang));
    }

    setTimeout(() => {
      navigate('/user/alerts', {
        state: {
          liveRoute: selectedRoute,
          alternateRoute: routeOptions.safest === selectedRoute ? routeOptions.fastest : routeOptions.safest,
          destinationLabel: destinationCoords?.displayName || destinationQuery,
          destinationCoords,
          voiceOn,
          alertLang,
        },
      });
    }, 1200);
  };

  const isLiveFix = locationStatus === 'active';

  return (
    <div className="p-6 space-y-6">
      {/* Toast popup */}
      {toastMessage && (
        <NotificationToast message={toastMessage} type={toastType} onClose={() => setToastMessage(null)} />
      )}

      {/* Title */}
      <div>
        <h1 className="font-display text-xl font-bold text-navy-900 dark:text-white tracking-tight uppercase">Start Navigation</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Design safest routes bypassing critical risk hotspots around Nashik.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Form & Route Summary */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-start">

          {/* Navigation Inputs Form */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-4">
            <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-500" /> Start Navigation
            </h2>

            <div className="space-y-3">
              {/* Live location (source) */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">
                  <LocateFixed className={`w-3 h-3 ${isLiveFix ? 'text-green-500' : 'text-amber-500'}`} />
                  Your Live Location
                  {locationStatus === 'locating' && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                </label>
                <div className="mt-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 px-3 py-2 text-xs text-gray-700 dark:text-slate-300">
                  {sourceLabel}
                </div>
                {locationError && (
                  <p className="mt-1 text-[10px] text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Location permission was blocked — allow it in your browser to use your real position.
                  </p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">Destination Location</label>
                <div className="mt-1 flex gap-2">
                  <div className="relative flex-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-red-500 text-xs">🏁</span>
                    </div>
                    <input
                      type="text"
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFindRoute()}
                      className="block w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 focus:outline-none"
                      placeholder="Enter destination"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFindRoute}
                    disabled={isSearchingRoute}
                    className="shrink-0 px-3 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-slate-900 flex items-center justify-center transition-colors"
                    title="Find road route"
                  >
                    {isSearchingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Routes are calculated live along real roads via OpenStreetMap.</p>
              </div>
            </div>

            {/* Route Option Switcher */}
            <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-2">Route Optimization Option</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!routeOptions}
                  onClick={() => setRouteType('safest')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    routeType === 'safest'
                      ? 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-700'
                      : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  🟢 Safest Route
                </button>
                <button
                  type="button"
                  disabled={!routeOptions}
                  onClick={() => setRouteType('fastest')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    routeType === 'fastest'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-700'
                      : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  🔴 Fastest Route
                </button>
              </div>
            </div>
          </div>

          {/* Route Safety Summary Card */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-navy-950 dark:text-white uppercase border-b border-gray-100 dark:border-slate-700 pb-2 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-amber-500" /> Route Safety Summary
              </h2>

              {selectedRoute ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold block uppercase">Est. Distance</span>
                      <span className="text-lg font-black text-navy-900 dark:text-white">{selectedRoute.distance}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold block uppercase">Est. Time</span>
                      <span className="text-lg font-black text-navy-900 dark:text-white">{selectedRoute.time}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold block uppercase">Accident Risk Level</span>
                    <div className="mt-1">
                      <RiskBadge level={selectedRoute.riskLevel} />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold block uppercase mb-2">
                      En Route Hotspots ({selectedRoute.totalHotspots})
                    </span>

                    {selectedRoute.totalHotspots > 0 ? (
                      <div className="space-y-2.5">
                        {selectedRoute.hotspotsEnRoute.map((spot, i) => (
                          <div key={i} className="flex items-start space-x-2 bg-red-50 dark:bg-red-950/40/50 p-2.5 rounded-lg border border-red-100">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="text-xs font-bold text-red-900">{spot.name}</div>
                              <div className="text-[10px] text-red-700">{spot.detail} ({spot.risk} risk)</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-green-700 bg-green-50 dark:bg-green-950/40 p-3 rounded-lg font-semibold text-center border border-green-200 dark:border-green-900">
                        🟢 Zero critical clusters en-route. Safe path.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg text-center border border-dashed border-gray-200 dark:border-slate-700">
                  Enter a destination and tap <Search className="w-3 h-3 inline mx-0.5" /> to calculate a live road route from your current location.
                </div>
              )}
            </div>

            {/* Alert Language Selector */}
            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-2">
                Voice Alert Language
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALERT_LANGUAGES.map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setAlertLang(code)}
                    className={`py-2 px-2 rounded-lg border text-xs font-semibold transition ${
                      alertLang === code
                        ? 'bg-amber-400 border-amber-400 text-slate-900'
                        : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Trip & Mute Controls */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`py-2 px-3 rounded-lg border text-center flex items-center justify-center font-bold text-xs cursor-pointer transition ${
                  voiceOn
                    ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200'
                    : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={voiceOn ? 'Mute Voice Alerts' : 'Unmute Voice Alerts'}
              >
                {voiceOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                <span className="ml-1 hidden sm:inline">{voiceOn ? 'ON' : 'OFF'}</span>
              </button>
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={!selectedRoute}
                className="col-span-2 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors border border-green-500 flex items-center justify-center gap-1.5 shadow-sm text-xs cursor-pointer"
              >
                <Play className="w-4 h-4" /> START TRIP
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Leaflet map */}
        <div className="lg:col-span-2 h-[550px] flex flex-col">
          <MapView
            hotspots={mockHotspots}
            selectedRoute={selectedRoute}
            userLocation={userLoc}
            showPins={true}
            showKde={true}
            showSpeedLimits={false}
            zoom={13}
          />
        </div>
      </div>
    </div>
  );
}
