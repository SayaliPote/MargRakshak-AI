/**
 * Real-world geocoding + road routing helpers.
 * Uses free, no-API-key public services:
 *  - Nominatim (OpenStreetMap) for place name -> coordinates
 *  - OSRM demo server for real road-following driving routes
 *
 * Both run as plain client-side fetch calls, so they work directly in the
 * browser once this app is deployed / running on the user's machine.
 */

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

/**
 * Turn a place name typed by the user into { lat, lng, displayName }.
 * Biases results towards Nashik so short queries like "CBS" or "Bitco point"
 * resolve to the right local place instead of a same-named place elsewhere.
 */
export async function geocodePlace(query) {
  if (!query || !query.trim()) {
    throw new Error('Please enter a destination.');
  }

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    addressdetails: '0',
    // Nashik bounding box (lon,lat,lon,lat) to bias local results
    viewbox: '73.70,20.10,73.95,19.85',
    bounded: '0',
  });

  const res = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Could not reach the location search service.');
  }

  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error(`Could not find "${query}". Try a more specific place name.`);
  }

  const best = data[0];
  return {
    lat: parseFloat(best.lat),
    lng: parseFloat(best.lon),
    displayName: best.display_name,
  };
}

/**
 * Best-effort reverse geocode of the driver's live coordinates into a
 * human-readable label (falls back to null on any failure).
 */
export async function reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      zoom: '16',
    });
    const res = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

/**
/**
 * Helper to fetch a genuine road alternative via a perpendicular offset via-point
 * when OSRM's default alternatives=true returns only a single route.
 */
async function fetchViaAlternative(from, to, primaryRoute) {
  try {
    const pts = primaryRoute?.path;
    if (!pts || pts.length < 4) return null;

    // Sample midpoint along the primary route
    const midIdx = Math.floor(pts.length / 2);
    const mid = pts[midIdx];

    const dLat = to.lat - from.lat;
    const dLng = to.lng - from.lng;
    const dist = Math.hypot(dLat, dLng);
    if (dist < 0.008) return null; // Very short trip

    // Lateral offsets normal to source-destination vector
    const offsetMag = Math.min(0.20, Math.max(0.035, dist * 0.12));
    const normalA = { lat: (-dLng / dist) * offsetMag, lng: (dLat / dist) * offsetMag };
    const normalB = { lat: (dLng / dist) * offsetMag, lng: (-dLat / dist) * offsetMag };

    const candidates = [
      { lat: mid[0] + normalA.lat, lng: mid[1] + normalA.lng },
      { lat: mid[0] + normalB.lat, lng: mid[1] + normalB.lng },
    ];

    for (const via of candidates) {
      const coords = `${via.lng},${via.lat}`;
      const url = `${OSRM_ROUTE_URL}/${from.lng},${from.lat};${coords};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.code === 'Ok' && json.routes && json.routes.length > 0) {
          const alt = json.routes[0];
          const altDistKm = alt.distance / 1000;
          const altDurationMin = alt.duration / 60;
          const distDiff = Math.abs(altDistKm - primaryRoute.distanceKm);

          // Ensure it's genuinely different (> 2% or > 0.3km difference)
          if (distDiff > 0.3 || Math.abs(altDurationMin - primaryRoute.durationMin) > 2) {
            return {
              path: alt.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
              distanceKm: altDistKm,
              durationMin: altDurationMin,
              isAlternative: true,
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('Via-point alternative route query failed:', err);
  }
  return null;
}

/**
 * Fetch one or more real, road-following driving routes between points from OSRM.
 * Supports source -> destination as well as intermediate stops / waypoints in order.
 * Guarantees 2 distinct route options whenever available.
 */
export async function fetchRoadRoutes(from, to, { waypoints = [], alternatives = true } = {}) {
  const validWaypoints = (waypoints || []).filter(
    (w) => w && !isNaN(w.lat) && !isNaN(w.lng)
  );

  // Case 1: Simple Source -> Destination (Guarantees 2 genuine routes when alternatives=true)
  if (validWaypoints.length === 0) {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const params = new URLSearchParams({
      overview: 'full',
      geometries: 'geojson',
      steps: 'false',
      alternatives: alternatives ? 'true' : 'false',
    });

    const res = await fetch(`${OSRM_ROUTE_URL}/${coords}?${params.toString()}`);
    if (!res.ok) {
      throw new Error('The road routing service is unavailable right now.');
    }

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No drivable road route was found between these two points.');
    }

    const mappedRoutes = data.routes.map((route, idx) => ({
      path: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      isAlternative: idx > 0,
    }));

    // If OSRM returned multiple genuine alternatives, use top 2
    if (mappedRoutes.length >= 2) {
      return mappedRoutes.slice(0, 2);
    }

    // If OSRM returned only 1 route but alternatives were requested,
    // query a genuine road alternative via an offset road corridor
    if (alternatives && mappedRoutes.length === 1) {
      const altRoute = await fetchViaAlternative(from, to, mappedRoutes[0]);
      if (altRoute) {
        return [mappedRoutes[0], altRoute];
      }
    }

    return mappedRoutes;
  }

  // Case 2: Multi-Stop Route passing through every point in the specified order
  const allPoints = [from, ...validWaypoints, to];
  const coords = allPoints.map((p) => `${p.lng},${p.lat}`).join(';');
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
    alternatives: 'false',
  });

  const res = await fetch(`${OSRM_ROUTE_URL}/${coords}?${params.toString()}`);
  if (!res.ok) {
    throw new Error('The multi-stop road routing service is unavailable right now.');
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No drivable road route was found connecting all requested stops in order.');
  }

  const primaryRoute = {
    path: data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distanceKm: data.routes[0].distance / 1000,
    durationMin: data.routes[0].duration / 60,
    isMultiStop: true,
    waypointCount: validWaypoints.length,
  };

  // If alternatives requested, query leg alternatives to offer Route 1 vs Route 2
  if (alternatives && validWaypoints.length <= 5) {
    try {
      const legPromises = [];
      for (let i = 0; i < allPoints.length - 1; i++) {
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        const pCoords = `${p1.lng},${p1.lat};${p2.lng},${p2.lat}`;
        legPromises.push(
          fetch(`${OSRM_ROUTE_URL}/${pCoords}?overview=full&geometries=geojson&steps=false&alternatives=true`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        );
      }
      const legResults = await Promise.all(legPromises);
      const hasAlts = legResults.some((lr) => lr && lr.routes && lr.routes.length > 1);

      if (hasAlts) {
        let altPath = [];
        let altDist = 0;
        let altDur = 0;

        for (const lr of legResults) {
          if (lr && lr.routes && lr.routes.length > 0) {
            // Select secondary road alternative if available, otherwise primary
            const chosen = lr.routes.length > 1 ? lr.routes[1] : lr.routes[0];
            const legCoords = chosen.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            altPath = altPath.concat(altPath.length > 0 ? legCoords.slice(1) : legCoords);
            altDist += chosen.distance / 1000;
            altDur += chosen.duration / 60;
          }
        }

        if (altPath.length > 0) {
          return [
            primaryRoute,
            {
              path: altPath,
              distanceKm: altDist,
              durationMin: altDur,
              isMultiStop: true,
              waypointCount: validWaypoints.length,
              isAlternative: true,
            },
          ];
        }
      }
    } catch {
      // In case leg alternatives fail, fall back to returning primaryRoute
    }
  }

  return [primaryRoute];
}

