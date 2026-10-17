/**
 * MargRakshak AI — Road Routing & Vehicle Interpolation Utilities
 * Provides:
 *  - High-precision distance-weighted interpolation along road polylines
 *  - True road-distance calculation from vehicle to hotspots
 *  - FastAPI / OSRM route fetcher with client-side fallback
 */

import { calculateDistance } from './distance';

/**
 * Computes cumulative road distance in meters at every waypoint along a polyline.
 * @param {Array<[number, number]>} path - Array of [lat, lng]
 * @returns {{ cumDistances: number[], totalDistanceMeters: number }}
 */
export function computeCumulativeDistances(path) {
  if (!path || path.length === 0) {
    return { cumDistances: [], totalDistanceMeters: 0 };
  }

  const cumDistances = [0];
  let total = 0;

  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const distMeters = calculateDistance(
      { lat: prev[0], lng: prev[1] },
      { lat: curr[0], lng: curr[1] }
    ) * 1000;
    total += distMeters;
    cumDistances.push(total);
  }

  return { cumDistances, totalDistanceMeters: total };
}

/**
 * Interpolates an exact [lat, lng] along the road network at targetDistanceMeters from the start.
 * Ensures the vehicle strictly glides on the road line without jumping or cutting corners.
 *
 * @param {Array<[number, number]>} path - Array of [lat, lng]
 * @param {number[]} cumDistances - Precomputed cumulative distances from computeCumulativeDistances
 * @param {number} targetDistanceMeters - Distance from start in meters
 * @returns {{ lat: number, lng: number, index: number, bearing: number }}
 */
export function interpolatePositionAtDistance(path, cumDistances, targetDistanceMeters) {
  if (!path || path.length === 0) return { lat: 0, lng: 0, index: 0, bearing: 0 };
  if (path.length === 1 || targetDistanceMeters <= 0) {
    return { lat: path[0][0], lng: path[0][1], index: 0, bearing: 0 };
  }

  const total = cumDistances[cumDistances.length - 1];
  if (targetDistanceMeters >= total) {
    const last = path[path.length - 1];
    return { lat: last[0], lng: last[1], index: path.length - 1, bearing: 0 };
  }

  // Binary search for the segment containing targetDistanceMeters
  let low = 0;
  let high = cumDistances.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (cumDistances[mid] <= targetDistanceMeters) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const segIdx = Math.max(0, high);
  const nextIdx = Math.min(path.length - 1, segIdx + 1);

  const d0 = cumDistances[segIdx];
  const d1 = cumDistances[nextIdx];
  const segLen = d1 - d0;

  const t = segLen > 0 ? (targetDistanceMeters - d0) / segLen : 0;
  const p0 = path[segIdx];
  const p1 = path[nextIdx];

  const lat = p0[0] + t * (p1[0] - p0[0]);
  const lng = p0[1] + t * (p1[1] - p0[1]);

  // Bearing in degrees from p0 to p1
  const dLat = p1[0] - p0[0];
  const dLng = p1[1] - p0[1];
  const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;

  return { lat, lng, index: segIdx, bearing: (bearing + 360) % 360 };
}

/**
 * Projects a target point (e.g. an accident hotspot) onto the route polyline
 * and returns its cumulative road distance (in meters) from the route start.
 *
 * @param {Array<[number, number]>} path - Road polyline
 * @param {number[]} cumDistances - Cumulative distances along path
 * @param {{ lat: number, lng: number }} targetPoint - Hotspot coordinate
 * @returns {{ distanceAlongRouteMeters: number, distanceToRoadMeters: number }}
 */
export function findDistanceAlongRouteToPoint(path, cumDistances, targetPoint) {
  if (!path || path.length < 2) return { distanceAlongRouteMeters: 0, distanceToRoadMeters: Infinity };

  let minCrossDist = Infinity;
  let bestAlongRoute = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    // Distance from target to p1
    const d1 = calculateDistance({ lat: p1[0], lng: p1[1] }, targetPoint) * 1000;
    const d2 = calculateDistance({ lat: p2[0], lng: p2[1] }, targetPoint) * 1000;
    const segLen = calculateDistance({ lat: p1[0], lng: p1[1] }, { lat: p2[0], lng: p2[1] }) * 1000;

    let projAlong = 0;
    let distToSeg = 0;

    if (segLen === 0) {
      projAlong = 0;
      distToSeg = d1;
    } else {
      // Projection factor t on segment
      const t = Math.max(0, Math.min(1, ((targetPoint.lat - p1[0]) * (p2[0] - p1[0]) + (targetPoint.lng - p1[1]) * (p2[1] - p1[1])) /
        ((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2)));

      const projLat = p1[0] + t * (p2[0] - p1[0]);
      const projLng = p1[1] + t * (p2[1] - p1[1]);
      distToSeg = calculateDistance({ lat: projLat, lng: projLng }, targetPoint) * 1000;
      projAlong = t * segLen;
    }

    if (distToSeg < minCrossDist) {
      minCrossDist = distToSeg;
      bestAlongRoute = cumDistances[i] + projAlong;
    }
  }

  return {
    distanceAlongRouteMeters: bestAlongRoute,
    distanceToRoadMeters: minCrossDist
  };
}

/**
 * Fetches turn-by-turn road route between two points.
 * Tries the FastAPI backend endpoint `/api/route` first, falling back to public OSRM.
 */
export async function fetchSnappedRoute(from, to, { alternatives = false } = {}) {
  // 1. Try local FastAPI endpoint
  try {
    const apiRes = await fetch(
      `/api/route?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}&alternatives=${alternatives}`
    );
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data.primaryRoute) {
        return {
          path: data.primaryRoute.path,
          distanceKm: data.primaryRoute.distanceKm,
          durationMin: data.primaryRoute.durationMin,
        };
      }
    }
  } catch (err) {
    // Backend offline; fallback to direct OSRM
  }

  // 2. Direct OSRM fallback
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Routing engine unavailable.');
  }
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No drivable road route found.');
  }

  const primary = data.routes[0];
  return {
    path: primary.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distanceKm: Math.round((primary.distance / 1000) * 10) / 10,
    durationMin: Math.round(primary.duration / 60),
  };
}
