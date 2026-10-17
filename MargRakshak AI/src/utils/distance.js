/**
 * Calculates the geodetic distance between two points on the Earth's surface
 * using the Haversine formula.
 * 
 * @param {Object} loc1 - First location {latitude, longitude} or {lat, lng}
 * @param {Object} loc2 - Second location {latitude, longitude} or {lat, lng}
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(loc1, loc2) {
  const lat1 = loc1.latitude !== undefined ? loc1.latitude : loc1.lat;
  const lon1 = loc1.longitude !== undefined ? loc1.longitude : loc1.lng;
  
  const lat2 = loc2.latitude !== undefined ? loc2.latitude : loc2.lat;
  const lon2 = loc2.longitude !== undefined ? loc2.longitude : loc2.lng;

  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function rad2deg(rad) {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates great-circle distance between two coordinates in meters
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates forward azimuth (bearing) from coordinate 1 to coordinate 2 in degrees [0, 360)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Bearing angle in degrees [0, 360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = deg2rad(lat1);
  const phi2 = deg2rad(lat2);
  const deltaLambda = deg2rad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (rad2deg(theta) + 360) % 360;
}

/**
 * Converts degree angle to 16-point cardinal compass direction
 * @param {number} deg 
 * @returns {string} Cardinal direction (e.g. NORTH, NE, SW)
 */
export function degreeToCardinal(deg) {
  const directions = [
    "NORTH", "NNE", "NE", "ENE",
    "EAST", "ESE", "SE", "SSE",
    "SOUTH", "SSW", "SW", "WSW",
    "WEST", "WNW", "NW", "NNW"
  ];
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

/**
 * Linearly interpolates between two [lat, lng] coordinates
 * @param {Array<number>} coord1 [lat, lng]
 * @param {Array<number>} coord2 [lat, lng]
 * @param {number} t Progress from 0 to 1
 * @returns {Array<number>} [lat, lng]
 */
export function interpolateCoordinate(coord1, coord2, t) {
  const lat = coord1[0] + (coord2[0] - coord1[0]) * t;
  const lng = coord1[1] + (coord2[1] - coord1[1]) * t;
  return [lat, lng];
}

/**
 * Given a road route's [lat, lng] path and a list of hotspots, returns the
 * hotspots that fall within `thresholdMeters` of the route, each annotated
 * with its closest distance (in meters) to the path.
 */
export function findHotspotsNearRoute(path, hotspots, thresholdMeters = 500) {
  if (!path || path.length === 0 || !hotspots || hotspots.length === 0) return [];

  return hotspots
    .map((spot) => {
      const spotLat = Number(spot.latitude ?? spot.lat);
      const spotLng = Number(spot.longitude ?? spot.lng);
      if (isNaN(spotLat) || isNaN(spotLng)) return null;

      let minKm = Infinity;
      for (const [lat, lng] of path) {
        const d = calculateDistance({ lat, lng }, { lat: spotLat, lng: spotLng });
        if (d < minKm) minKm = d;
      }
      return {
        ...spot,
        lat: spotLat,
        lng: spotLng,
        latitude: spotLat,
        longitude: spotLng,
        distanceToRouteMeters: Math.round(minKm * 1000),
      };
    })
    .filter(Boolean)
    .filter((spot) => spot.distanceToRouteMeters <= thresholdMeters)
    .sort((a, b) => a.distanceToRouteMeters - b.distanceToRouteMeters);
}
