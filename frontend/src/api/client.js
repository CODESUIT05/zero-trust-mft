// frontend/src/api/client.js
import axios from 'axios';

// Hardcode backend URL for static server mode (no proxy)
const BACKEND_URL = 'http://127.0.0.1:39999'; // ← Change if your backend uses a different port

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: false
});

// Request interceptor: Add auth token + device fingerprint
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Simple device fingerprint for Zero Trust
    const generateFingerprint = () => {
      try {
        const ua = navigator.userAgent;
        const screen = `${screen.width}x${screen.height}`;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return btoa(`${ua}|${screen}|${tz}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
      } catch {
        return 'dev_fingerprint_fallback';
      }
    };
    
    const fp = localStorage.getItem('deviceFp') || generateFingerprint();
    config.headers['x-device-fp'] = fp;
    localStorage.setItem('deviceFp', fp);
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle auth errors + auto-refresh tokens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};
    
    // Skip refresh logic for auth endpoints to avoid infinite loops
    const isAuthEndpoint = config?.url?.includes('/auth/');
    
    // Handle 401 Unauthorized: Token expired → try refresh
    if (response?.status === 401 && !config?._retry && !isAuthEndpoint) {
      config._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Attempt to refresh access token
        const refreshResponse = await axios.post(
          `${BACKEND_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        
        const refreshData = refreshResponse?.data;
        
        if (refreshData?.success && refreshData?.data?.accessToken) {
          // Save new access token
          localStorage.setItem('accessToken', refreshData.data.accessToken);
          
          // Retry original request with new token
          config.headers.Authorization = `Bearer ${refreshData.data.accessToken}`;
          return api(config);
        }
      } catch (refreshError) {
        // Refresh failed → force logout
        console.error('Token refresh failed:', refreshError);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // For other errors, return as-is with safe fallback
    return Promise.reject(error);
  }
);

export default api;