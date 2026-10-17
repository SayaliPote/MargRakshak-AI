import React, { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon, Globe, MapPinned, Maximize2, Minimize2, Crosshair, Navigation, Locate } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { calculateDistanceMeters } from '../utils/distance';

// Fix Leaflet marker icons in React/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Exclusively RED custom marker for Blackspots (Requirement 3 & 7)
const createBlackspotMarker = (riskLevel = 'HIGH') => {
  const isCritical = riskLevel === 'CRITICAL';
  const size = isCritical ? 34 : 30;
  const anchorX = size / 2;
  const anchorY = size;

  const svgTemplate = `
    <div class="relative flex items-center justify-center filter drop-shadow-md cursor-pointer hover:scale-110 transition-transform">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}px" height="${size}px">
        <path fill="#DC2626" stroke="#991B1B" stroke-width="1.2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="4.2" fill="#FFFFFF"/>
        <circle cx="12" cy="9" r="2.2" fill="#DC2626"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgTemplate,
    className: 'blackspot-marker-pin',
    iconSize: [size, size],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -size + 4]
  });
};

// Source Marker: Emerald Green with 'S' symbol (Visually distinct from blackspot red)
const createSourceMarker = () => {
  const svgTemplate = `
    <div class="relative flex items-center justify-center filter drop-shadow-lg cursor-pointer">
      <div class="absolute -top-1 w-7 h-7 bg-emerald-500 rounded-full animate-ping opacity-25"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36px" height="36px">
        <path fill="#059669" stroke="#047857" stroke-width="1.2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="4.5" fill="#FFFFFF"/>
        <text x="12" y="12.2" font-size="9" font-weight="900" fill="#059669" text-anchor="middle" font-family="system-ui, sans-serif">S</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgTemplate,
    className: 'source-marker-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
};

// Destination Marker: Royal Indigo with 'D' symbol (Visually distinct from blackspot red)
const createDestinationMarker = () => {
  const svgTemplate = `
    <div class="relative flex items-center justify-center filter drop-shadow-lg cursor-pointer">
      <div class="absolute -top-1 w-7 h-7 bg-indigo-500 rounded-full animate-ping opacity-25"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36px" height="36px">
        <path fill="#4338CA" stroke="#3730A3" stroke-width="1.2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="4.5" fill="#FFFFFF"/>
        <text x="12" y="12.2" font-size="9" font-weight="900" fill="#4338CA" text-anchor="middle" font-family="system-ui, sans-serif">D</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgTemplate,
    className: 'destination-marker-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
};

// Waypoint / Intermediate Stop Marker: Vivid Amber with stop number (e.g. 1, 2, 3...)
const createWaypointMarker = (stopNumber = 1) => {
  const svgTemplate = `
    <div class="relative flex items-center justify-center filter drop-shadow-lg cursor-pointer hover:scale-110 transition-transform">
      <div class="absolute -top-1 w-7 h-7 bg-amber-500 rounded-full animate-ping opacity-25"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36px" height="36px">
        <path fill="#D97706" stroke="#B45309" stroke-width="1.2" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="4.8" fill="#FFFFFF"/>
        <text x="12" y="12.2" font-size="9" font-weight="900" fill="#B45309" text-anchor="middle" font-family="system-ui, sans-serif">${stopNumber}</text>
      </svg>
    </div>
  `;

  return L.divIcon({
    html: svgTemplate,
    className: 'waypoint-marker-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
};

// Map click pointer / manual selection marker
const createManualSelectionMarker = () => {
  const svgTemplate = `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-50"></div>
      <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
        <div class="w-2 h-2 bg-white rounded-full"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgTemplate,
    className: 'manual-point-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

// User Location Custom Icon (Blue Dot Pulse fallback)
const userLocationIcon = L.divIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-60"></div>
      <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
    </div>
  `,
  className: 'user-pulse-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// High-Precision Directional Vehicle Beacon DivIcon
const createVehicleBeaconIcon = (color = '#2563EB', vehicleType = 'car', heading = 0) => {
  let iconSvg = '';
  if (vehicleType === 'bike') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`;
  } else if (vehicleType === 'emergency') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h1"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M10 9v4"/><path d="M8 11h4"/></svg>`;
  } else {
    // Car
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7c0 .6.4 1 1 1h1"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
  }

  return L.divIcon({
    className: 'live-beacon-marker',
    html: `
      <div class="live-tracker-beacon" style="--beacon-color: ${color}">
        <div class="beacon-pulse"></div>
        <div class="beacon-rotator" style="transform: rotate(${Math.round(heading)}deg);">
          <div class="heading-cone"></div>
          <div class="beacon-core">
            ${iconSvg}
          </div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
};

/**
 * 60 FPS Linear Interpolation (LERP) Controller for the live vehicle marker
 */
function SmoothVehicleMarker({
  location,
  vehicleType = 'car',
  color = '#2563EB',
  followUser = false,
  showBreadcrumbs = true,
  t
}) {
  const map = useMap();
  const markerRef = useRef(null);

  // Position coordinates
  const currentPosRef = useRef([location.latitude, location.longitude]);
  const startPosRef = useRef([location.latitude, location.longitude]);
  const targetPosRef = useRef([location.latitude, location.longitude]);

  // Bearing angles
  const currentBearingRef = useRef(location.heading || 0);
  const startBearingRef = useRef(location.heading || 0);
  const targetBearingRef = useRef(location.heading || 0);

  // Timing & LERP
  const startTimeRef = useRef(performance.now());
  const lastPacketTimeRef = useRef(performance.now());
  const durationRef = useRef(200);
  const lastPanTimeRef = useRef(0);

  // Handle incoming position updates
  useEffect(() => {
    if (!location || isNaN(location.latitude) || isNaN(location.longitude)) return;

    const now = performance.now();
    const timeDelta = now - lastPacketTimeRef.current;
    lastPacketTimeRef.current = now;
    durationRef.current = Math.min(300, Math.max(80, timeDelta * 1.05));

    const newLat = location.latitude;
    const newLng = location.longitude;
    const newHeading = typeof location.heading === 'number' ? location.heading : currentBearingRef.current;

    // Fast teleport check (> 300m leap)
    const distJump = calculateDistanceMeters(
      currentPosRef.current[0],
      currentPosRef.current[1],
      newLat,
      newLng
    );

    if (distJump > 300) {
      currentPosRef.current = [newLat, newLng];
      startPosRef.current = [newLat, newLng];
      targetPosRef.current = [newLat, newLng];
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      }
    } else {
      startPosRef.current = [currentPosRef.current[0], currentPosRef.current[1]];
      targetPosRef.current = [newLat, newLng];
    }

    startBearingRef.current = currentBearingRef.current;
    targetBearingRef.current = newHeading;
    startTimeRef.current = now;
  }, [location]);

  // 60 FPS requestAnimationFrame LERP loop
  useEffect(() => {
    let animId = null;

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      const duration = durationRef.current;
      const tProgress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;

      // Coordinate LERP
      const lat = startPosRef.current[0] + (targetPosRef.current[0] - startPosRef.current[0]) * tProgress;
      const lng = startPosRef.current[1] + (targetPosRef.current[1] - startPosRef.current[1]) * tProgress;
      currentPosRef.current = [lat, lng];

      // Shortest circular angle difference
      const angleDiff = ((targetBearingRef.current - startBearingRef.current + 540) % 360) - 180;
      const bearing = (startBearingRef.current + angleDiff * tProgress + 360) % 360;
      currentBearingRef.current = bearing;

      // Update Leaflet marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);

        const el = markerRef.current.getElement();
        if (el) {
          const rotator = el.querySelector('.beacon-rotator');
          if (rotator) {
            rotator.style.transform = `rotate(${Math.round(bearing)}deg)`;
          }
        }
      }

      // Camera follow with throttled pan
      if (followUser && map) {
        if (!lastPanTimeRef.current || (now - lastPanTimeRef.current > 90)) {
          lastPanTimeRef.current = now;
          map.panTo([lat, lng], { animate: false });
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [followUser, map]);

  const beaconIcon = React.useMemo(() => {
    return createVehicleBeaconIcon(color, vehicleType, currentBearingRef.current);
  }, [color, vehicleType]);

  return (
    <Marker
      ref={markerRef}
      position={currentPosRef.current}
      icon={beaconIcon}
      zIndexOffset={3000}
    >
      <Popup>
        <div className="text-xs font-semibold p-1 min-w-[150px]">
          <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
            <span className="capitalize">{vehicleType}</span>
            <span>•</span>
            <span>{t ? t('common.map.youAreHere') : 'You Are Here'}</span>
          </div>
          <div className="mt-1 text-gray-600 dark:text-gray-300 font-mono text-[11px]">
            <div>Speed: <span className="font-bold text-gray-900 dark:text-white">{location.speed || 0} km/h</span></div>
            <div>Heading: <span className="font-bold text-gray-900 dark:text-white">{Math.round(currentBearingRef.current)}° ({location.cardinal || 'N'})</span></div>
            {location.accuracy != null && (
              <div className="text-[10px] text-gray-400 mt-0.5">Accuracy: ±{location.accuracy}m</div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// Automatically recalculates and invalidates map dimensions when the container resizes,
// fixes layout transitions, orientation changes, or minimize/maximize
function MapResizeHandler({ isMaximized }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (!container) return;

    const triggerInvalidate = () => {
      try {
        if (map && map.getContainer() && map.getContainer().offsetParent !== null) {
          map.invalidateSize({ pan: false });
        }
      } catch (err) {}
    };

    triggerInvalidate();
    const frameId = requestAnimationFrame(triggerInvalidate);
    const timer = setTimeout(triggerInvalidate, 200);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(triggerInvalidate);
    });

    resizeObserver.observe(container);

    window.addEventListener('resize', triggerInvalidate);
    window.addEventListener('orientationchange', triggerInvalidate);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', triggerInvalidate);
      window.removeEventListener('orientationchange', triggerInvalidate);
    };
  }, [map, isMaximized]);

  return null;
}

// Component to dynamically set map view to target coordinates without fighting user panning
function RecenterMap({ center, zoom }) {
  const map = useMap();
  const lastCenterRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    try {
      if (center && Array.isArray(center) && !isNaN(center[0]) && !isNaN(center[1])) {
        const last = lastCenterRef.current;
        // Only recenter when coordinates change significantly (> 200 meters)
        const hasMovedSignificantly = !last ||
          Math.abs(last[0] - center[0]) > 0.002 ||
          Math.abs(last[1] - center[1]) > 0.002;

        if (hasMovedSignificantly) {
          lastCenterRef.current = center;
          if (map.getContainer() && map.getContainer().offsetParent !== null) {
            map.setView(center, zoom || map.getZoom());
          }
        }
      }
    } catch (e) {
      // Ignored during transitions
    }
  }, [center, zoom, map]);

  return null;
}

// Click listener inside Leaflet MapContainer for manual location selection (Requirement 5)
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      }
    },
  });
  return null;
}

// Fit map viewport to encompass source, all intermediate waypoints, destination, and the route
function FitBoundsHandler({ sourceLocation, destinationLocation, waypoints = [], selectedRoute }) {
  const map = useMap();
  const lastKeyRef = useRef('');

  useEffect(() => {
    if (!map) return;
    try {
      const latLngs = [];
      if (sourceLocation && !isNaN(sourceLocation.lat) && !isNaN(sourceLocation.lng)) {
        latLngs.push([sourceLocation.lat, sourceLocation.lng]);
      }
      if (Array.isArray(waypoints)) {
        waypoints.forEach((wp) => {
          const lat = parseFloat(wp?.lat ?? wp?.latitude);
          const lng = parseFloat(wp?.lng ?? wp?.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            latLngs.push([lat, lng]);
          }
        });
      }
      if (destinationLocation && !isNaN(destinationLocation.lat) && !isNaN(destinationLocation.lng)) {
        latLngs.push([destinationLocation.lat, destinationLocation.lng]);
      }
      if (selectedRoute && Array.isArray(selectedRoute.path) && selectedRoute.path.length > 0) {
        selectedRoute.path.forEach((pt) => {
          if (Array.isArray(pt) && !isNaN(pt[0]) && !isNaN(pt[1])) {
            latLngs.push(pt);
          }
        });
      }

      if (latLngs.length >= 2) {
        const bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          const key = `${bounds.getNorth().toFixed(3)}_${bounds.getSouth().toFixed(3)}_${bounds.getEast().toFixed(3)}_${bounds.getWest().toFixed(3)}`;
          if (key !== lastKeyRef.current) {
            lastKeyRef.current = key;
            if (map.getContainer() && map.getContainer().offsetParent !== null) {
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
            }
          }
        }
      }
    } catch (e) {
      // Ignored during component transitions
    }
  }, [map, sourceLocation, destinationLocation, waypoints, selectedRoute]);

  return null;
}

// Route color constants — Active route: #3B82F6 (blue-500), Alternate route: #10B981 (emerald-500)
const ROUTE_BLUE_DOMINANT = '#3B82F6'; // Active route polyline: Blue (#3B82F6)
const ROUTE_BLUE_HALO = '#93C5FD';     // Blue halo glow for active route
const ROUTE_GREEN_ALT = '#10B981';     // Alternate route polyline: Emerald Green (#10B981)
const ROUTE_GREEN_ALT_HALO = '#6EE7B7';// Emerald halo glow for alternate route
const ROUTE_BLUE_ALT = '#10B981';      // Backward compatibility alias for alternate route

export default function MapView({ 
  hotspots = [], 
  geoJson = null,
  selectedHotspot = null, 
  onSelectHotspot = () => {},
  routes = [],
  selectedRoute = null,
  onSelectRoute = () => {},
  userLocation = null,
  sourceLocation = null,         // { lat, lng, label }
  destinationLocation = null,    // { lat, lng, label }
  waypoints = [],                // Array of { id, lat, lng, label, stopNumber }
  selectedPoint = null,          // { lat, lng, label } - manual point on map
  onMapClick = null,             // callback ({ lat, lng })
  onSelectAsSource = null,       // callback (spot)
  onSelectAsDestination = null,  // callback (spot)
  showPins = true,
  showKde = true,
  showSpeedLimits = false,
  showRouteLegend = true,
  routeHotspotsOnly = false,
  initialMapMode = 'roadmap',
  mapMode: externalMapMode = null,
  onMapModeChange = null,
  zoom = 13,
  center = [19.9975, 73.7898], // Nashik City Center
  vehicleType = 'car',
  vehicleColor = '#2563EB',
  followUser = false,
  showBreadcrumbs = true,
  enableSmoothLerp = true,
}) {
  const { t } = useLanguage();

  // Map view mode state — 'roadmap' (Google), 'osm' (OpenStreetMap), 'satellite' (Google)
  const [internalMapMode, setInternalMapMode] = useState(() => {
    try {
      const saved = localStorage.getItem('margrakshak_map_view_mode');
      // Sanitize legacy/unsupported values back to roadmap
      if (!saved || saved === 'hybrid') return initialMapMode || 'roadmap';
      return saved;
    } catch {
      return initialMapMode || 'roadmap';
    }
  });

  const [isMaximized, setIsMaximized] = useState(false);

  const activeMapMode = externalMapMode || internalMapMode;

  const handleMapModeSwitch = (mode) => {
    // Valid modes: roadmap | osm | satellite. Anything else falls back to roadmap.
    const validModes = ['roadmap', 'osm', 'satellite'];
    const safeMode = validModes.includes(mode) ? mode : 'roadmap';
    setInternalMapMode(safeMode);
    try {
      localStorage.setItem('margrakshak_map_view_mode', safeMode);
    } catch (e) {
      // Storage unavailable
    }
    if (onMapModeChange) {
      onMapModeChange(safeMode);
    }
  };

  // Support direct GeoJSON FeatureCollection or pre-parsed hotspots array with robust validation
  const effectiveHotspots = React.useMemo(() => {
    let list = [];
    if (Array.isArray(hotspots) && hotspots.length > 0) {
      list = hotspots;
    } else if (geoJson && Array.isArray(geoJson.features)) {
      list = geoJson.features.map((feature, idx) => {
        const coords = feature.geometry?.coordinates || [73.7898, 19.9975];
        const lng = parseFloat(coords[0]);
        let lat = parseFloat(coords[1]);
        if (lat > 9 && lat < 11) lat = lat + 10;
        const p = feature.properties || {};
        return {
          id: p.id || `hotspot-${idx}`,
          name: p.name || 'Unnamed Blackspot',
          lat,
          lng,
          ...p,
        };
      });
    }

    // Ensure every blackspot has valid numeric lat/lng and standardized fields
    const parsed = list
      .map((spot, idx) => {
        let lat = spot.lat ?? spot.latitude;
        let lng = spot.lng ?? spot.longitude;
        lat = parseFloat(lat);
        lng = parseFloat(lng);
        if (lat > 9 && lat < 11) lat = lat + 10;

        const isValidLat = typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
        const isValidLng = typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;

        if (!isValidLat || !isValidLng) {
          return null;
        }

        const riskLevel = String(spot.riskLevel || spot.risk_level || 'HIGH').toUpperCase();
        const riskScore = typeof spot.riskScore === 'number' 
          ? spot.riskScore 
          : (typeof spot.risk_score === 'number' ? spot.risk_score : 0.75);
        const accidentCount = spot.accidentCount ?? spot.accident_count ?? 0;
        const fatalities = spot.fatalities ?? 0;
        const radius = spot.radius ?? spot.radius_meters ?? 200;

        return {
          ...spot,
          id: spot.id ?? `blackspot-${idx}`,
          name: spot.name || 'Accident Blackspot',
          lat,
          lng,
          latitude: lat,
          longitude: lng,
          policeStation: spot.policeStation || spot.police_station || '',
          roadNo: spot.roadNo || spot.road_no || '',
          riskLevel,
          riskScore,
          accidentCount,
          fatalities,
          radius,
        };
      })
      .filter(Boolean);

    // If routeHotspotsOnly is active and selectedRoute has a path, display only blackspots near the route
    if (routeHotspotsOnly && selectedRoute && Array.isArray(selectedRoute.path) && selectedRoute.path.length > 0) {
      if (Array.isArray(selectedRoute.hotspotsEnRoute) && selectedRoute.hotspotsEnRoute.length > 0) {
        const enRouteNames = new Set(selectedRoute.hotspotsEnRoute.map((h) => (h.name || '').toLowerCase().trim()));
        const filtered = parsed.filter((spot) => enRouteNames.has((spot.name || '').toLowerCase().trim()));
        if (filtered.length > 0) return filtered;
      }

      // Proximity check fallback (within 450m of route path)
      return parsed.filter((spot) => {
        for (const pt of selectedRoute.path) {
          if (Array.isArray(pt) && !isNaN(pt[0]) && !isNaN(pt[1])) {
            if (calculateDistanceMeters(pt[0], pt[1], spot.lat, spot.lng) <= 450) {
              return true;
            }
          }
        }
        return false;
      });
    }

    return parsed;
  }, [hotspots, geoJson, routeHotspotsOnly, selectedRoute]);

  // Resolve map center: prioritize selected hotspot, destination, source, user location, or default
  let mapCenter = center;
  if (selectedHotspot && !isNaN(selectedHotspot.lat) && !isNaN(selectedHotspot.lng)) {
    mapCenter = [selectedHotspot.lat, selectedHotspot.lng];
  } else if (destinationLocation && !isNaN(destinationLocation.lat) && !isNaN(destinationLocation.lng)) {
    mapCenter = [destinationLocation.lat, destinationLocation.lng];
  } else if (sourceLocation && !isNaN(sourceLocation.lat) && !isNaN(sourceLocation.lng)) {
    mapCenter = [sourceLocation.lat, sourceLocation.lng];
  } else if (userLocation && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude)) {
    mapCenter = [userLocation.latitude, userLocation.longitude];
  }

  return (
    <div className={`${
      isMaximized 
        ? 'fixed inset-0 z-[5000] w-screen h-screen bg-slate-950 flex flex-col p-2' 
        : 'w-full h-full min-h-[350px] relative rounded-2xl overflow-hidden border border-gray-200/80 dark:border-uber-borderDark shadow-card z-0'
    }`}>
      {/* Floating Map View Mode Selector & Maximize/Minimize Toggle */}
      <div className="absolute top-3 left-14 z-[400] flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-1 border border-slate-200/90 dark:border-slate-800 shadow-md gap-1">
        {/* Option 1: Google Maps Roadmap */}
        <button
          type="button"
          onClick={() => handleMapModeSwitch('roadmap')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeMapMode === 'roadmap'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Google Maps Roadmap (default)"
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Roadmap</span>
        </button>

        {/* Option 2: OpenStreetMap */}
        <button
          type="button"
          onClick={() => handleMapModeSwitch('osm')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeMapMode === 'osm'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="OpenStreetMap — open community map"
        >
          <MapPinned className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">OSM</span>
        </button>

        {/* Option 3: Satellite */}
        <button
          type="button"
          onClick={() => handleMapModeSwitch('satellite')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeMapMode === 'satellite'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Satellite View"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Satellite</span>
        </button>

        {/* Fullscreen / Minimize Map control */}
        <button
          type="button"
          onClick={() => setIsMaximized(!isMaximized)}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-l border-slate-200 dark:border-slate-800 ml-0.5 pl-2 ${
            isMaximized
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title={isMaximized ? 'Minimize Map (Restore layout)' : 'Maximize Map (Full screen)'}
        >
          {isMaximized ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minimize</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Maximize</span>
            </>
          )}
        </button>
      </div>

      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true}
        tap={false}
        touchZoom={true}
        dragging={true}
        className="w-full h-full"
      >
        <MapResizeHandler isMaximized={isMaximized} />

        {/* Layer 1: Google Maps Roadmap (Default) — standard light road map matching Google Maps UI */}
        {activeMapMode === 'roadmap' && (
          <TileLayer
            key="tile-roadmap"
            attribution='Map data &copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
            tileSize={256}
          />
        )}

        {/* Layer 2: OpenStreetMap — open community map, distinct from Google Maps */}
        {activeMapMode === 'osm' && (
          <TileLayer
            key="tile-osm"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            subdomains={['a', 'b', 'c']}
            maxZoom={19}
            tileSize={256}
          />
        )}

        {/* Layer 3: Google Maps Satellite View */}
        {activeMapMode === 'satellite' && (
          <TileLayer
            key="tile-satellite"
            attribution='Map data &copy; <a href="https://www.google.com/maps">Google Maps</a>'
            url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            subdomains={['0', '1', '2', '3']}
            maxZoom={20}
            tileSize={256}
          />
        )}

        <RecenterMap center={mapCenter} zoom={selectedHotspot ? 15 : zoom} />

        {/* Automatic viewport fitting for source, all waypoints, destination, and the route */}
        <FitBoundsHandler 
          sourceLocation={sourceLocation} 
          destinationLocation={destinationLocation} 
          waypoints={waypoints} 
          selectedRoute={selectedRoute} 
        />

        {/* Map Click Listener for interactive manual location selection */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}

        {/* User Location indicator (Live GPS pulse / Smooth LERP Vehicle Marker) */}
        {userLocation && !isNaN(userLocation.latitude) && !isNaN(userLocation.longitude) && (
          enableSmoothLerp ? (
            <SmoothVehicleMarker
              location={userLocation}
              vehicleType={vehicleType}
              color={vehicleColor}
              followUser={followUser}
              showBreadcrumbs={showBreadcrumbs}
              t={t}
            />
          ) : (
            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userLocationIcon}>
              <Popup>
                <div className="text-xs font-semibold p-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400 block">{t('common.map.youAreHere')}</span>
                  <span className="text-gray-500">{t('common.map.speed')}: {userLocation.speed || 0} km/h</span>
                </div>
              </Popup>
            </Marker>
          )
        )}

        {/* Manual Selected Point on Map (Temporary feedback indicator) */}
        {selectedPoint && !isNaN(selectedPoint.lat) && !isNaN(selectedPoint.lng) && (
          <Marker 
            position={[selectedPoint.lat, selectedPoint.lng]} 
            icon={createManualSelectionMarker()}
          >
            <Popup autoPan={true}>
              <div className="text-xs p-1">
                <span className="font-bold text-navy-950 dark:text-white block">Selected Map Point</span>
                <span className="text-gray-500 font-mono text-[10px] block mt-0.5">
                  {selectedPoint.lat.toFixed(5)}, {selectedPoint.lng.toFixed(5)}
                </span>
                {selectedPoint.label && (
                  <span className="text-[11px] text-gray-700 dark:text-gray-300 block mt-1">
                    {selectedPoint.label}
                  </span>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dedicated Source Marker (Emerald Green, distinct from red blackspots) */}
        {sourceLocation && !isNaN(sourceLocation.lat) && !isNaN(sourceLocation.lng) && (
          <Marker 
            position={[sourceLocation.lat, sourceLocation.lng]} 
            icon={createSourceMarker()}
          >
            <Popup>
              <div className="text-xs p-1">
                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold uppercase text-[10px]">
                  <span>Source Location</span>
                </div>
                <p className="font-bold text-navy-950 dark:text-white mt-0.5">
                  {sourceLocation.label || 'Starting Point'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {sourceLocation.lat.toFixed(4)}, {sourceLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dedicated Destination Marker (Royal Indigo, distinct from red blackspots) */}
        {destinationLocation && !isNaN(destinationLocation.lat) && !isNaN(destinationLocation.lng) && (
          <Marker 
            position={[destinationLocation.lat, destinationLocation.lng]} 
            icon={createDestinationMarker()}
          >
            <Popup>
              <div className="text-xs p-1">
                <div className="flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-bold uppercase text-[10px]">
                  <span>Destination Location</span>
                </div>
                <p className="font-bold text-navy-950 dark:text-white mt-0.5">
                  {destinationLocation.label || 'Destination'}
                </p>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  {destinationLocation.lat.toFixed(4)}, {destinationLocation.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dedicated Waypoint / Stop Markers (Vivid Amber with Stop Number, distinct from red blackspots) */}
        {waypoints && waypoints.length > 0 && waypoints.map((wp, idx) => {
          const lat = parseFloat(wp?.lat ?? wp?.latitude);
          const lng = parseFloat(wp?.lng ?? wp?.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          const stopNum = wp.stopNumber || idx + 1;
          const label = wp.label || wp.displayName || `Stop ${stopNum}`;

          return (
            <Marker 
              key={`waypoint-${wp.id || idx}`} 
              position={[lat, lng]} 
              icon={createWaypointMarker(stopNum)}
            >
              <Popup>
                <div className="text-xs p-1">
                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold uppercase text-[10px]">
                    <span>Stop #{stopNum}</span>
                  </div>
                  <p className="font-bold text-navy-950 dark:text-white mt-0.5">
                    {label}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Alternative (Non-Selected) Routes: Rendered in Green (#22C55E) with interactive selection */}
        {routes && routes.length > 0 && routes.map((r, rIdx) => {
          if (!r || !Array.isArray(r.path) || r.path.length === 0) return null;
          const isSelected = selectedRoute && (
            (selectedRoute.id != null && r.id != null && String(selectedRoute.id) === String(r.id)) ||
            (selectedRoute.label && r.label && selectedRoute.label === r.label) ||
            (selectedRoute.name && r.name && selectedRoute.name === r.name)
          );
          if (isSelected) return null;

          return (
            <React.Fragment key={`alt-route-${r.id || rIdx}`}>
              {/* Invisible wider hit area for click selection */}
              <Polyline 
                positions={r.path}
                pathOptions={{
                  color: 'transparent',
                  weight: 18,
                  cursor: 'pointer'
                }}
                eventHandlers={{
                  click: () => onSelectRoute && onSelectRoute(r),
                }}
              />
              {/* Outer soft green contrast halo for clear visibility on all map layers */}
              <Polyline 
                positions={r.path} 
                pathOptions={{
                  color: ROUTE_GREEN_ALT_HALO,
                  weight: 11,
                  opacity: 0.30,
                  dashArray: null,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Main alternate emerald green route polyline: Dashed (#10B981, 10px dash 8px gap) */}
              <Polyline 
                positions={r.path}
                pathOptions={{
                  color: ROUTE_GREEN_ALT,
                  weight: 5,
                  opacity: 0.90,
                  dashArray: '10, 8',
                  lineCap: 'butt',
                  lineJoin: 'round',
                  cursor: 'pointer'
                }}
                eventHandlers={{
                  click: () => onSelectRoute && onSelectRoute(r),
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Selected Route Polyline: Exclusively dominant royal blue with halo glow */}
        {selectedRoute && Array.isArray(selectedRoute.path) && selectedRoute.path.length > 0 && (
          <React.Fragment key={`selected-route-${selectedRoute.id || 'active'}`}>
            {/* Outer soft blue halo glow */}
            <Polyline 
              positions={selectedRoute.path} 
              pathOptions={{
                color: ROUTE_BLUE_HALO,
                weight: 13,
                opacity: 0.30,
                dashArray: null,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Main dominant blue route line (#3B82F6) */}
            <Polyline 
              positions={selectedRoute.path} 
              pathOptions={{
                color: ROUTE_BLUE_DOMINANT,
                weight: 6,
                opacity: 0.90,
                dashArray: null,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </React.Fragment>
        )}

        {/* Hotspot Pins: EXCLUSIVELY RED MARKERS (Requirement 3 & 7) */}
        {showPins && effectiveHotspots.map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.lat, spot.lng]} 
            icon={createBlackspotMarker(spot.riskLevel)}
            eventHandlers={{
              click: () => onSelectHotspot(spot),
            }}
          >
            <Popup>
              <div className="text-xs p-1 min-w-[210px] max-w-[270px]">
                <div className="flex items-center justify-between gap-1 mb-1 pb-1 border-b border-gray-100 dark:border-slate-700">
                  <span className="font-black text-[10px] text-red-600 dark:text-red-400 uppercase tracking-wider">
                    Accident Blackspot
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900">
                    {spot.riskLevel}
                  </span>
                </div>
                <p className="font-bold text-sm text-navy-900 dark:text-white leading-snug mb-1">{spot.name}</p>
                
                {spot.policeStation && (
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-1">
                    Police Station: <span className="font-semibold text-gray-700 dark:text-slate-300">{spot.policeStation}</span> {spot.roadNo ? `(${spot.roadNo})` : ''}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-1.5 py-1.5 my-1.5 bg-gray-50 dark:bg-slate-800/80 rounded-lg px-2 text-[10px] border border-gray-100 dark:border-slate-700">
                  <div>
                    <span className="text-gray-400 block font-medium">Accidents</span>
                    <span className="font-extrabold text-navy-900 dark:text-white text-xs">{spot.accidentCount}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Fatalities</span>
                    <span className="font-extrabold text-red-600 dark:text-red-400 text-xs">{spot.fatalities}</span>
                  </div>
                </div>

                {spot.safetyRecommendation && (
                  <p className="text-[10px] text-gray-600 dark:text-slate-300 italic mb-2 line-clamp-2">
                    "{spot.safetyRecommendation}"
                  </p>
                )}

                {(onSelectAsSource || onSelectAsDestination) && (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    {onSelectAsSource && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsSource(spot);
                        }}
                        className="py-1 px-1 text-center text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                      >
                        Set as Source
                      </button>
                    )}
                    {onSelectAsDestination && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsDestination(spot);
                        }}
                        className="py-1 px-1 text-center text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded border border-indigo-300 dark:border-indigo-800 transition-colors cursor-pointer"
                      >
                        Set as Dest
                      </button>
                    )}
                  </div>
                )}

                <button 
                  onClick={() => onSelectHotspot(spot)}
                  className="w-full py-1.5 px-2 text-center text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  {t('common.map.viewDetails')}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* KDE Heatmap Density Layer (interactive: false so clicks pass through to map) */}
        {showKde && effectiveHotspots.map((spot) => {
          const color = '#EF4444'; // Red density halo for all blackspot risk zones
          return (
            <React.Fragment key={`kde-${spot.id}`}>
              <Circle
                center={[spot.lat, spot.lng]}
                radius={250}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.10,
                  color: 'transparent',
                  interactive: false,
                }}
              />
              <Circle
                center={[spot.lat, spot.lng]}
                radius={120}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.20,
                  color: 'transparent',
                  interactive: false,
                }}
              />
              <Circle
                center={[spot.lat, spot.lng]}
                radius={50}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.38,
                  color: 'transparent',
                  interactive: false,
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Speed Limit Indicators Overlay */}
        {showSpeedLimits && effectiveHotspots.map((spot) => {
          const speedLimit = spot.speedLimit || 40;
          return (
            <Circle
              key={`speed-${spot.id}`}
              center={[spot.lat, spot.lng]}
              radius={70}
              pathOptions={{
                fillColor: '#FFFFFF',
                fillOpacity: 0.85,
                color: '#DC2626',
                weight: 2
              }}
            >
              <Popup>
                <div className="text-center font-bold text-xs text-red-600 p-1">
                  {t('common.map.speedLimit')}: {speedLimit} km/h
                </div>
              </Popup>
            </Circle>
          );
        })}

      </MapContainer>

      {/* Route Comparison Legend Overlay */}
      {showRouteLegend && routes && routes.length > 1 && (
        <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-3 border border-slate-200/90 dark:border-slate-800 shadow-md text-xs space-y-2 pointer-events-auto max-w-[220px]">
          <div className="font-bold text-slate-800 dark:text-white flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5 text-[11px] uppercase tracking-wider">
            <span>Route Legend</span>
          </div>
          {/* Active Route Entry: Solid Blue line (#3B82F6) */}
          <div className="flex items-center gap-2.5">
            <svg width="20" height="8" viewBox="0 0 20 8" className="shrink-0" aria-hidden="true">
              <line x1="0" y1="4" x2="20" y2="4" stroke={ROUTE_BLUE_DOMINANT} strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                {selectedRoute?.label || selectedRoute?.name || 'Active Route'}
              </span>
              <span className="text-[10px] text-blue-500 dark:text-blue-400 block font-semibold">
                Active — Solid Blue
              </span>
            </div>
          </div>
          {/* Alternate Routes Entry: Dashed Emerald Green line (#10B981) */}
          {routes.filter((r) => {
            const isSel = selectedRoute && (
              (selectedRoute.id != null && r.id != null && String(selectedRoute.id) === String(r.id)) ||
              (selectedRoute.label && r.label && selectedRoute.label === r.label) ||
              (selectedRoute.name && r.name && selectedRoute.name === r.name)
            );
            return !isSel;
          }).slice(0, 2).map((altRoute, aIdx) => (
            <div key={`legend-alt-${altRoute.id || aIdx}`} className="flex items-center gap-2.5">
              {/* Dashed emerald line indicator — 10px dash / 8px gap matching the map polyline */}
              <svg width="20" height="8" viewBox="0 0 20 8" className="shrink-0" aria-hidden="true">
                <line
                  x1="0" y1="4" x2="20" y2="4"
                  stroke={ROUTE_GREEN_ALT}
                  strokeWidth="3"
                  strokeLinecap="butt"
                  strokeDasharray="6,4"
                />
              </svg>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                  {altRoute.label || altRoute.name || 'Alternate Route'}
                </span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 block font-semibold">
                  Alternate — Dashed Green
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
