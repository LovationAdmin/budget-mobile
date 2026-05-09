import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';

import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { BiometricService } from '@/services/biometric.service';
import { NotificationsService } from '@/services/notifications.service';
import type { User, LoginRequest, LoginResponse, SignupRequest } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True between app launch and biometric prompt success when biometric is enabled. */
  isLocked: boolean;

  login:    (payload: LoginRequest) => Promise<LoginResponse>;
  signup:   (payload: SignupRequest) => Promise<void>;
  logout:   () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Magic link
  requestMagicLink: (email: string) => Promise<void>;
  verifyMagicLink:  (token: string) => Promise<void>;

  // Biometric
  unlock:        () => Promise<boolean>;
  enableBiometric:  () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  biometricEnabled: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // ── Boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const hasSession = await AuthService.hasSession() || !!(await AuthService.getStoredAccessToken());
        if (!hasSession) return;

        const bioOpt = await BiometricService.isEnabled();
        setBiometricEnabled(bioOpt);

        if (bioOpt && (await BiometricService.isAvailable())) {
          // Defer profile fetch until unlock — keeps token unused until biometric pass.
          setIsLocked(true);
          return;
        }

        const profile = await UserService.getProfile();
        setUser(profile);
        NotificationsService.register();
      } catch {
        await AuthService.clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const finalizeLogin = useCallback(async (resp: LoginResponse) => {
    if (resp.requires_2fa) return;
    const profile = await UserService.getProfile();
    setUser(profile);
    setIsLocked(false);
    NotificationsService.register();
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginRequest): Promise<LoginResponse> => {
    const resp = await AuthService.login(payload);
    await finalizeLogin(resp);
    return resp;
  }, [finalizeLogin]);

  const signup = useCallback(async (payload: SignupRequest) => {
    await AuthService.signup(payload);
    // Backend requires email verification before login — caller routes to verify-email.
  }, []);

  const logout = useCallback(async () => {
    await NotificationsService.unregister();
    await AuthService.logout();
    await BiometricService.setEnabled(false);
    setUser(null);
    setIsLocked(false);
    setBiometricEnabled(false);
    router.replace('/(auth)/login');
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await UserService.getProfile();
    setUser(profile);
  }, []);

  const requestMagicLink = useCallback(async (email: string) => {
    await AuthService.requestMagicLink(email);
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    const resp = await AuthService.verifyMagicLink(token);
    await finalizeLogin(resp);
  }, [finalizeLogin]);

  const unlock = useCallback(async (): Promise<boolean> => {
    const ok = await BiometricService.prompt('Authentification BudgetFamille');
    if (!ok) return false;
    const profile = await UserService.getProfile();
    setUser(profile);
    setIsLocked(false);
    NotificationsService.register();
    return true;
  }, []);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!(await BiometricService.isAvailable())) return false;
    const ok = await BiometricService.prompt('Activer le déverrouillage biométrique');
    if (!ok) return false;
    await BiometricService.setEnabled(true);
    setBiometricEnabled(true);
    return true;
  }, []);

  const disableBiometric = useCallback(async () => {
    await BiometricService.setEnabled(false);
    setBiometricEnabled(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, isLoading,
        isAuthenticated: user !== null,
        isLocked,
        login, signup, logout, refreshUser,
        requestMagicLink, verifyMagicLink,
        unlock, enableBiometric, disableBiometric, biometricEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
