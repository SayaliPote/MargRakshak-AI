import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateDistanceMeters, calculateBearing, degreeToCardinal } from '../utils/distance';

// Nashik BYK College Road default mock location
export const NASHIK_DEFAULT = {
  latitude: 20.0084,
  longitude: 73.7635,
  accuracy: 8,
  speed: 0,
  heading: 0,
  cardinal: 'NORTH',
  altitude: null,
  timestamp: Date.now(),
  isHighAccuracy: true
};

/**
 * Production-grade High-Frequency Geolocation Hook with:
 * - 1-second / sub-second GPS heartbeat streaming
 * - Hardware fallback: dynamically computes forward Azimuth bearing and speed
 *   when mobile/desktop browser hardware reports null
 * - Continuous fallback heartbeat timer for resilient tracking when stationary
 * - Detailed accuracy grading & granular error state classification
 * 
 * @param {boolean} enableRealTracking 
 * @param {Object} options 
 * @returns {Object} { location, error, status, setLocation, heartbeatTick, telemetry, resetTracking }
 */
export function useGeolocation(enableRealTracking = false, options = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300,
    heartbeatIntervalMs = 400,
    minDistanceForHeadingMeters = 1.0,
  } = options;

  const [location, setLocation] = useState(NASHIK_DEFAULT);
  const [error, setError] = useState(null);
  // 'mock' | 'locating' | 'active' | 'denied' | 'unavailable' | 'timeout' | 'error'
  const [status, setStatus] = useState(enableRealTracking ? 'locating' : 'mock');
  const [heartbeatTick, setHeartbeatTick] = useState(0);

  // Telemetry aggregates
  const [telemetry, setTelemetry] = useState({
    distanceTraveledMeters: 0,
    readingCount: 0,
    isHighAccuracy: true,
    cadenceMs: 0
  });

  // Internal state tracking refs
  const previousCoordRef = useRef(null);
  const lastHeadingRef = useRef(0);
  const lastLocationRef = useRef(location);
  const lastUpdateTimeRef = useRef(Date.now());
  const distanceSumRef = useRef(0);
  const readingCountRef = useRef(0);
  const isTrackingActiveRef = useRef(enableRealTracking);

  // Sync ref with state
  useEffect(() => {
    lastLocationRef.current = location;
  }, [location]);

  useEffect(() => {
    isTrackingActiveRef.current = enableRealTracking;
  }, [enableRealTracking]);

  const resetTracking = useCallback(() => {
    previousCoordRef.current = null;
    lastHeadingRef.current = 0;
    distanceSumRef.current = 0;
    readingCountRef.current = 0;
    setTelemetry({
      distanceTraveledMeters: 0,
      readingCount: 0,
      isHighAccuracy: true,
      cadenceMs: 0
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setStatus('unavailable');
      return;
    }

    if (!enableRealTracking) {
      setStatus('mock');
      return;
    }

    setStatus('locating');

    let watchId = null;
    let heartbeatTimer = null;

    /**
     * Process raw GeolocationPosition with precision math & hardware fallback
     */
    const processPosition = (pos) => {
      const now = Date.now();
      const coords = pos.coords;
      const latitude = coords.latitude;
      const longitude = coords.longitude;
      const accuracy = coords.accuracy ? Math.round(coords.accuracy) : 10;
      const altitude = coords.altitude != null ? Math.round(coords.altitude) : null;

      const prev = previousCoordRef.current;
      let resolvedSpeed = coords.speed != null && !isNaN(coords.speed) ? coords.speed * 3.6 : null;
      let resolvedHeading = coords.heading != null && !isNaN(coords.heading) ? coords.heading : null;
      let distMeters = 0;

      if (prev) {
        distMeters = calculateDistanceMeters(prev.lat, prev.lng, latitude, longitude);
        const timeDiffSec = (now - prev.timestamp) / 1000;

        // Fallback speed calculation when browser reports null/0
        if (resolvedSpeed === null || isNaN(resolvedSpeed)) {
          if (timeDiffSec > 0.05) {
            resolvedSpeed = Math.min(180, (distMeters / timeDiffSec) * 3.6);
          } else {
            resolvedSpeed = 0;
          }
        }

        // Fallback heading calculation using Azimuth forward bearing
        if (resolvedHeading === null || isNaN(resolvedHeading)) {
          if (distMeters >= minDistanceForHeadingMeters) {
            resolvedHeading = calculateBearing(prev.lat, prev.lng, latitude, longitude);
            lastHeadingRef.current = resolvedHeading;
          } else {
            resolvedHeading = lastHeadingRef.current;
          }
        } else {
          lastHeadingRef.current = resolvedHeading;
        }

        // Accumulate distance traveled
        if (distMeters > 0.5 && distMeters < 500) {
          distanceSumRef.current += distMeters;
        }
      } else {
        if (resolvedSpeed === null) resolvedSpeed = 0;
        if (resolvedHeading === null) resolvedHeading = lastHeadingRef.current || 0;
      }

      previousCoordRef.current = { lat: latitude, lng: longitude, timestamp: now };
      const cadence = now - lastUpdateTimeRef.current;
      lastUpdateTimeRef.current = now;
      readingCountRef.current += 1;

      const cardinal = degreeToCardinal(resolvedHeading);
      const isHighAccuracy = accuracy <= 25;

      const newLocation = {
        latitude,
        longitude,
        accuracy,
        speed: Math.max(0, Math.round(resolvedSpeed * 10) / 10),
        heading: Math.round(((resolvedHeading % 360) + 360) % 360),
        cardinal,
        altitude,
        timestamp: now,
        isHighAccuracy
      };

      setLocation(newLocation);
      setError(null);
      setStatus('active');
      setHeartbeatTick((t) => (t + 1) % 10000);

      setTelemetry({
        distanceTraveledMeters: Math.round(distanceSumRef.current),
        readingCount: readingCountRef.current,
        isHighAccuracy,
        cadenceMs: cadence
      });
    };

    /**
     * Handle geolocation errors with standard GeolocationPositionError codes
     */
    const handleError = (err) => {
      console.warn('[useGeolocation Warning]', err.message, 'Code:', err.code);

      let classifiedStatus = 'error';
      let message = err.message || 'Location error';

      if (err.code === 1) {
        classifiedStatus = 'denied';
        message = 'Location access was denied. Please allow GPS permission in your browser.';
      } else if (err.code === 2) {
        classifiedStatus = 'unavailable';
        message = 'Position is unavailable. Check your device GPS signal.';
      } else if (err.code === 3) {
        classifiedStatus = 'timeout';
        message = 'Acquiring GPS fix timed out.';
      }

      setError(message);
      setStatus(classifiedStatus);
    };

    const geoOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    // 1. Immediate quick position check
    navigator.geolocation.getCurrentPosition(processPosition, handleError, geoOptions);

    // 2. Continuous watchPosition pipeline
    watchId = navigator.geolocation.watchPosition(processPosition, handleError, geoOptions);

    // 3. Fallback Heartbeat Timer
    // If device is stationary and watchPosition pauses firing, keep heartbeat visual and stream alive
    heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastUpdateTimeRef.current;
      if (elapsed >= heartbeatIntervalMs && lastLocationRef.current) {
        setHeartbeatTick((t) => (t + 1) % 10000);
      }
    }, heartbeatIntervalMs);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
      }
    };
  }, [enableRealTracking, enableHighAccuracy, timeout, maximumAge, heartbeatIntervalMs, minDistanceForHeadingMeters]);

  return {
    location,
    error,
    status,
    setLocation,
    heartbeatTick,
    telemetry,
    resetTracking
  };
}
