import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, ENDPOINTS, SECURE_STORE_KEYS } from '@/constants/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach access token ─────────────────────────────────────────
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: auto-refresh on 401 ────────────────────────────────────────
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
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

      const { data } = await axios.post(
        `${API_BASE_URL}${ENDPOINTS.REFRESH}`,
        { refresh_token: refreshToken },
      );

      const newToken: string = data.access_token;
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, newToken);
      if (data.refresh_token) {
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refresh_token);
      }

      pendingRequests.forEach((cb) => cb(newToken));
      pendingRequests = [];

      original.headers.Authorization = `Bearer ${newToken}`;
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
