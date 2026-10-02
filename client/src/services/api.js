import axios from 'axios';

const rawBaseURL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000';
const resolvedBaseURL = rawBaseURL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const API = axios.create({
  baseURL: resolvedBaseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ── Request Interceptor: Attach JWT Token ────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ecoroute_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Error formatting & 401 handling ────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token expired or invalid (401), clear local storage if on auth failure
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/api/auth/login') ||
                             error.config?.url?.includes('/api/auth/register');
      if (!isAuthEndpoint && localStorage.getItem('ecoroute_token')) {
        localStorage.removeItem('ecoroute_token');
        localStorage.removeItem('ecoroute_user');
      }
    }

    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

// ════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION
// ════════════════════════════════════════════════════════════════════════════
export const loginUser = (credentials) =>
  API.post('/api/auth/login', credentials);

export const registerUser = (userData) =>
  API.post('/api/auth/register', userData);

export const getMe = () =>
  API.get('/api/auth/me');

// ════════════════════════════════════════════════════════════════════════════
// PICKUP REQUESTS
// ════════════════════════════════════════════════════════════════════════════
export const getRequests = (params = {}) =>
  API.get('/api/requests', { params });

export const getRequest = (id) =>
  API.get(`/api/requests/${id}`);

export const createRequest = (data) =>
  API.post('/api/requests', data);

export const updateRequest = (id, data) =>
  API.patch(`/api/requests/${id}`, data);

export const deleteRequest = (id) =>
  API.delete(`/api/requests/${id}`);

export const updateRequestStatus = (id, status) =>
  API.patch(`/api/requests/${id}/status`, { status });

export const cancelRequest = (id) =>
  API.patch(`/api/requests/${id}/cancel`);

export const assignRequest = (requestId, crewId) =>
  API.patch(`/api/requests/${requestId}/assign`, { crewId });

export const getRequestStats = () =>
  API.get('/api/requests/stats');

// ════════════════════════════════════════════════════════════════════════════
// COLLECTION CREWS
// ════════════════════════════════════════════════════════════════════════════
export const getCrews = () =>
  API.get('/api/crews');

export const getCrew = (id) =>
  API.get(`/api/crews/${id}`);

export const createCrew = (data) =>
  API.post('/api/crews', data);

export const updateCrew = (id, data) =>
  API.patch(`/api/crews/${id}`, data);

export const getCrewRequests = (id) =>
  API.get(`/api/crews/${id}/requests`);

// Authenticated Crew Operations
export const getMyCrewProfile = () =>
  API.get('/api/crew/profile');

export const getMyCrewRequests = () =>
  API.get('/api/crew/requests');

export const updateMyCrewStatus = (status) =>
  API.patch('/api/crew/status', { status });

// ════════════════════════════════════════════════════════════════════════════
// SMART ROUTE OPTIMIZER (Phase 08)
// ════════════════════════════════════════════════════════════════════════════
export const getMyRoute = () =>
  API.get('/api/routes/my-route');

export const getCrewRoute = (crewId) =>
  API.get(`/api/routes/crew/${crewId}`);

// ════════════════════════════════════════════════════════════════════════════
// USERS (Admin only)
// ════════════════════════════════════════════════════════════════════════════
export const getUsers = () =>
  API.get('/api/users');

export const getUser = (id) =>
  API.get(`/api/users/${id}`);

export const createUser = (data) =>
  API.post('/api/users', data);

export default API;
