import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, ENDPOINTS, SECURE_STORE_KEYS } from '@/constants/api';
import type { AuthTokens, LoginRequest, SignupRequest, User } from '@/types';
import api from './api';

export const AuthService = {
  async login(payload: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, payload);
    await storeTokens(data);
    return data;
  },

  async signup(payload: SignupRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const { data } = await axios.post(`${API_BASE_URL}${ENDPOINTS.SIGNUP}`, payload);
    await storeTokens(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post(ENDPOINTS.LOGOUT);
    } catch {
      // best-effort
    } finally {
      await clearTokens();
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.FORGOT_PASSWORD}`, { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.RESET_PASSWORD}`, { token, password });
  },

  async resendVerification(email: string): Promise<void> {
    await axios.post(`${API_BASE_URL}${ENDPOINTS.RESEND_VERIFY}`, { email });
  },

  async getStoredAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  },

  async clearSession(): Promise<void> {
    await clearTokens();
  },
};

async function storeTokens(data: AuthTokens) {
  if (data.access_token) {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN, data.access_token);
  }
  if (data.refresh_token) {
    await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }
}

async function clearTokens() {
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN);
}
