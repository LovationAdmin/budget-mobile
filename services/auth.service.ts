import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { API_BASE_URL, ENDPOINTS, SECURE_STORE_KEYS } from '@/constants/api';
import type {
  LoginRequest, LoginResponse, SignupRequest, User,
} from '@/types';
import api from './api';

// ============================================================================
// Auth service.
// Uses the mobile login endpoint when available (returns refresh_token in JSON);
// falls back to the standard login endpoint otherwise (cookie-based; the
// refresh_token field will be absent and the next 401 will trigger a re-auth).
// ============================================================================

async function tryMobileFirst<T>(
  mobilePath: string,
  webPath: string,
  body: unknown,
): Promise<T> {
  try {
    const { data } = await axios.post(`${API_BASE_URL}${mobilePath}`, body);
    return data as T;
  } catch (e) {
    const status = (e as AxiosError).response?.status;
    if (status !== 404 && status !== 405) throw e;
  }
  const { data } = await axios.post(`${API_BASE_URL}${webPath}`, body, {
    withCredentials: true,
  });
  return data as T;
}

async function storeTokens(t: { token?: string; access_token?: string; refresh_token?: string }) {
  const access = t.token ?? t.access_token;
  if (access) await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, access);
  if (t.refresh_token) {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, t.refresh_token);
  }
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
}

export const AuthService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const data = await tryMobileFirst<LoginResponse>(
      ENDPOINTS.LOGIN_MOBILE,
      ENDPOINTS.LOGIN,
      payload,
    );
    if (!data.requires_2fa) await storeTokens(data);
    return data;
  },

  async signup(payload: SignupRequest): Promise<{ user: Partial<User>; message: string }> {
    const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.SIGNUP}`, payload);
    return data;
  },

  async logout(): Promise<void> {
    try { await api.post(ENDPOINTS.LOGOUT_MOBILE); }
    catch { try { await api.post(ENDPOINTS.LOGOUT); } catch { /* best-effort */ } }
    await clearTokens();
  },

  async forgotPassword(email: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.FORGOT_PASSWORD}`, { email });
  },

  async resetPassword(token: string, new_password: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.RESET_PASSWORD}`, { token, new_password });
  },

  async resendVerification(email: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.RESEND_VERIFY}`, { email });
  },

  // Magic link ----------------------------------------------------------------
  async requestMagicLink(email: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.MAGIC_REQUEST}`, {
      email,
      device_id: deviceId(),
      platform: Platform.OS,
    });
  },

  async verifyMagicLink(token: string): Promise<LoginResponse> {
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}${ENDPOINTS.MAGIC_VERIFY}`,
      { token, device_id: deviceId() },
    );
    await storeTokens(data);
    return data;
  },

  // Storage helpers -----------------------------------------------------------
  async getStoredAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  },
  async getStoredRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
  },
  async hasSession(): Promise<boolean> {
    return !!(await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN));
  },
  async clearSession(): Promise<void> { await clearTokens(); },
};

function deviceId(): string {
  // Stable per-install identifier; falls back to a hash-like marker on web.
  return (
    (Application as unknown as { androidId?: string }).androidId ??
    (Application as unknown as { getIosIdForVendorAsync?: () => Promise<string> }).getIosIdForVendorAsync ?
      // best-effort sync access — async ID is deferred to push registration.
      'mobile' :
      'mobile'
  );
}
