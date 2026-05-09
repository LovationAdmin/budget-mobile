import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, ENDPOINTS, SECURE_STORE_KEYS } from '@/constants/api';

// ============================================================================
// Axios client with mobile-aware refresh.
// Strategy:
//   1. Attach Bearer token from SecureStore on each request.
//   2. On 401, try POST /auth/mobile/refresh with the SecureStore refresh token
//      in the body. Server returns { access_token, refresh_token, expires_in }.
//   3. If the mobile endpoint isn't deployed yet (404 / 405), fall back to the
//      legacy cookie-based POST /auth/refresh — useful while the backend
//      patch is in review.
//   4. If everything fails, clear the session so AuthContext can route to login.
// ============================================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

async function callRefresh(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
}> {
  // Try mobile endpoint first.
  try {
    const { data } = await axios.post(
      `${API_BASE_URL}${ENDPOINTS.REFRESH_MOBILE}`,
      { refresh_token: refreshToken },
      { timeout: 10_000 },
    );
    return { access_token: data.access_token, refresh_token: data.refresh_token };
  } catch (e) {
    const status = (e as AxiosError).response?.status;
    if (status !== 404 && status !== 405) throw e;
  }
  // Fallback: legacy cookie-based endpoint. We forward the token in body too —
  // older deploys ignore it, newer accept either form.
  const { data } = await axios.post(
    `${API_BASE_URL}${ENDPOINTS.REFRESH}`,
    { refresh_token: refreshToken },
    { withCredentials: true, timeout: 10_000 },
  );
  return { access_token: data.access_token, refresh_token: data.refresh_token };
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) throw new Error('no_refresh_token');

      const data = await callRefresh(refreshToken);

      await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, data.access_token);
      if (data.refresh_token) {
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refresh_token);
      }

      pendingRequests.forEach((cb) => cb(data.access_token));
      pendingRequests = [];

      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch {
      pendingRequests = [];
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
