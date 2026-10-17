/**
 * Central API Client for MargRakshak AI
 * Interacts with FastAPI backend via relative '/api/v1' paths handled by Vite proxy.
 * Automatically injects the JWT token stored in localStorage ('margrakshak_token').
 */

import { TOKEN_STORAGE_KEY } from '../context/AuthContext';

export const TOKEN_KEY = TOKEN_STORAGE_KEY;
const API_BASE_PREFIX = '/api/v1';

const CUSTOM_API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL).trim().replace(/\/$/, '')
  : '';

/**
 * Format endpoint path to ensure it targets the versioned /api/v1 prefix and optional backend URL.
 * @param {string} endpoint - e.g. '/accidents' or '/api/v1/accidents'
 * @returns {string} Fully qualified path e.g. '/api/v1/accidents' or 'http://localhost:8000/api/v1/accidents'
 */
function resolveUrl(endpoint) {
  let path = endpoint;
  if (!path.startsWith('/api/v1/') && !path.startsWith('/api/')) {
    const cleanEndpoint = path.startsWith('/') ? path : `/${path}`;
    path = `${API_BASE_PREFIX}${cleanEndpoint}`;
  }
  if (CUSTOM_API_URL && !path.startsWith('http')) {
    return `${CUSTOM_API_URL}${path}`;
  }
  return path;
}

/**
 * Core fetch wrapper with automatic JWT authorization and JSON error parsing.
 * @param {string} endpoint
 * @param {RequestInit} [options={}]
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const url = resolveUrl(endpoint);
  const headers = {
    ...options.headers,
  };

  // Attach token from localStorage if available
  let token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token && typeof token === 'string') {
    token = token.trim();
    // Remove accidental surrounding quotes
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      token = token.slice(1, -1).trim();
    }
    // Ensure not placeholder string
    if (token && token !== 'null' && token !== 'undefined') {
      if (!headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  // Set default JSON Content-Type when sending body data
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle HTTP error responses
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status} (${response.statusText})`;
    try {
      const errorJson = await response.json();
      if (errorJson && (errorJson.detail || errorJson.message)) {
        errorMessage = typeof errorJson.detail === 'string'
          ? errorJson.detail
          : (Array.isArray(errorJson.detail) ? errorJson.detail.map(d => d.msg || d).join(', ') : errorJson.message);
      }
    } catch {
      // Body was not JSON; use default message
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }

  // Return empty on 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Standard HTTP GET with optional query parameters.
 */
export function get(endpoint, params = {}, options = {}) {
  let url = endpoint;
  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  return apiRequest(url, { ...options, method: 'GET' });
}

/**
 * Standard HTTP POST
 */
export function post(endpoint, data = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * Standard HTTP PUT
 */
export function put(endpoint, data = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * Standard HTTP DELETE
 */
export function del(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Standard HTTP PATCH
 */
export function patch(endpoint, data = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

// -------------------------------------------------------------
// Domain Specific Endpoints (Accidents, Hotspots, Auth)
// -------------------------------------------------------------

/**
 * Get paginated list of accidents
 * @param {Object} [params] - { page, limit, severity, accident_type, start_date, end_date, location }
 */
export function getAccidents(params = {}) {
  return get('/accidents', params);
}

/**
 * Get single accident by ID
 */
export function getAccidentById(id) {
  return get(`/accidents/${id}`);
}

/**
 * Create a new accident record
 */
export function createAccident(accidentData) {
  return post('/accidents', accidentData);
}

/**
 * Update an existing accident record
 */
export function updateAccident(id, accidentData) {
  return put(`/accidents/${id}`, accidentData);
}

/**
 * Delete an accident record
 */
export function deleteAccident(id) {
  return del(`/accidents/${id}`);
}

/**
 * Get paginated list of hotspots
 * @param {Object} [params] - { risk_level, min_risk_score, algorithm, source, search, is_active, page, limit }
 */
export function getHotspots(params = {}) {
  return get('/hotspots', { limit: 200, ...params });
}

/**
 * Get single hotspot by ID
 */
export function getHotspotById(id) {
  return get(`/hotspots/${id}`);
}

/**
 * Create a new hotspot
 */
export function createHotspot(hotspotData) {
  return post('/hotspots', hotspotData);
}

/**
 * Update an existing hotspot
 */
export function updateHotspot(id, hotspotData) {
  return put(`/hotspots/${id}`, hotspotData);
}

/**
 * Delete a hotspot
 */
export function deleteHotspot(id) {
  return del(`/hotspots/${id}`);
}

/**
 * Export accidents as Leaflet-compatible RFC 7946 GeoJSON FeatureCollection
 * @param {Object} [params] - { severity, start_date, end_date, limit }
 */
export function getAccidentsGeoJSON(params = {}) {
  return get('/accidents/geojson', params);
}

/**
 * Export hotspots as Leaflet-compatible RFC 7946 GeoJSON FeatureCollection
 * @param {Object} [params] - { risk_level, min_risk_score, limit }
 */
export function getHotspotsGeoJSON(params = {}) {
  return get('/hotspots/geojson', { limit: 1000, ...params });
}

export function getUsers(params = {}) {
  return get('/users', params);
}

/**
 * Register a new driver user account
 * @param {Object} userData - { email, password, full_name, mobile?, preferred_language?, role: "user" }
 */
export function registerUser(userData) {
  return post('/auth/register', userData);
}

/**
 * Toggle user active/inactive status
 * @param {string|number} userId
 * @param {boolean} isActive
 */
export function toggleUserStatus(userId, isActive) {
  return patch(`/users/${userId}/status`, { is_active: isActive });
}

/**
 * Update user role
 * @param {string|number} userId
 * @param {string} newRole - e.g. 'admin' | 'user' | 'authority'
 */
export function updateUserRole(userId, newRole) {
  return patch(`/users/${userId}/role`, { role: newRole });
}

/**
 * Health check to verify backend status, database, and hotspots readiness
 */
export function getHealth() {
  return get('/health');
}

export default {
  apiRequest,
  get,
  post,
  put,
  patch,
  del,
  getAccidents,
  getAccidentById,
  createAccident,
  updateAccident,
  deleteAccident,
  getAccidentsGeoJSON,
  getHotspots,
  getHotspotById,
  createHotspot,
  updateHotspot,
  deleteHotspot,
  getHotspotsGeoJSON,
  getUsers,
  registerUser,
  toggleUserStatus,
  updateUserRole,
  getHealth,
};

