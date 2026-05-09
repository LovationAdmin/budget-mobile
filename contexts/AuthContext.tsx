import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import type { User, LoginRequest, SignupRequest } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check if we have a valid token and fetch profile
  useEffect(() => {
    (async () => {
      try {
        const token = await AuthService.getStoredAccessToken();
        if (token) {
          const profile = await UserService.getProfile();
          setUser(profile);
        }
      } catch {
        await AuthService.clearSession();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (payload: LoginRequest) => {
    const { user: u } = await AuthService.login(payload);
    setUser(u);
  };

  const signup = async (payload: SignupRequest) => {
    const { user: u } = await AuthService.signup(payload);
    setUser(u);
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const profile = await UserService.getProfile();
    setUser(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        signup,
        logout,
        refreshUser,
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
