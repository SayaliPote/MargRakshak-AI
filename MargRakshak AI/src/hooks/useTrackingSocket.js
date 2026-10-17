import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for high-frequency 1-second real-time GPS telemetry WebSocket broadcast
 * Inspired by TrackPulse app.js and script.js architecture.
 *
 * @param {Object} options
 * @param {boolean} options.enabled - whether streaming is active
 * @param {Object} options.location - current live location { latitude, longitude, speed, heading, accuracy }
 * @param {string} options.userName - user display name
 * @param {string} options.vehicleType - 'car' | 'bike' | 'emergency'
 * @param {string} options.vehicleColor - hex color string
 */
export function useTrackingSocket({
  enabled = false,
  location = null,
  userName = 'My Vehicle',
  vehicleType = 'car',
  vehicleColor = '#3b82f6',
} = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState(null);
  const [activeFleet, setActiveFleet] = useState([]);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const lastEmitTimeRef = useRef(0);
  const clientIdRef = useRef(
    `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );

  // Establish WebSocket connection
  useEffect(() => {
    if (!enabled) {
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {}
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Try local dev proxy host or fallback port 8000
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/api/tracking/ws/${clientIdRef.current}`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'init-fleet' && Array.isArray(data.fleet)) {
              setActiveFleet(data.fleet.filter((f) => f.id !== clientIdRef.current));
            } else if (data.type === 'location-update' && data.data) {
              if (data.data.id !== clientIdRef.current) {
                setActiveFleet((prev) => {
                  const filtered = prev.filter((u) => u.id !== data.data.id);
                  return [...filtered, data.data];
                });
              }
            } else if (data.type === 'user-disconnected' && data.id) {
              setActiveFleet((prev) => prev.filter((u) => u.id !== data.id));
            } else if (data.type === 'pong' && data.timestamp) {
              const rtt = Math.round((Date.now() - data.timestamp * 1000));
              setLatencyMs(Math.max(1, rtt));
            }
          } catch (e) {}
        };

        ws.onerror = () => {
          // WebSocket connection errors are normal when backend is offline; fallback gracefully
          setIsConnected(false);
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (!isUnmounted && enabled) {
            reconnectTimeoutRef.current = setTimeout(connect, 4000);
          }
        };
      } catch (err) {
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch (e) {}
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [enabled]);

  // High-frequency 1-second location transmission with rate-limiting
  useEffect(() => {
    if (!enabled || !isConnected || !location || !socketRef.current) return;
    if (socketRef.current.readyState !== WebSocket.OPEN) return;
    if (isNaN(location.latitude) || isNaN(location.longitude)) return;

    const now = Date.now();
    // Rate limit transmission: at most 1 packet per 400ms (2.5 updates/sec max)
    if (now - lastEmitTimeRef.current < 400) return;
    lastEmitTimeRef.current = now;

    const payload = {
      id: clientIdRef.current,
      name: userName,
      vehicleType,
      color: vehicleColor,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed || 0,
      heading: location.heading || 0,
      accuracy: location.accuracy || 10,
      altitude: location.altitude || null,
      timestamp: now / 1000,
    };

    try {
      socketRef.current.send(JSON.stringify(payload));
    } catch (e) {}
  }, [enabled, isConnected, location, userName, vehicleType, vehicleColor]);

  // Ping latency test
  const sendPing = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify({ type: 'ping', time: Date.now() }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isConnected) return;
    const interval = setInterval(sendPing, 10000);
    return () => clearInterval(interval);
  }, [enabled, isConnected, sendPing]);

  return {
    isConnected,
    latencyMs,
    activeFleet,
    clientId: clientIdRef.current,
  };
}
