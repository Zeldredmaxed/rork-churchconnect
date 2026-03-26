import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { api, setTokens, clearTokens } from '@/utils/api';
import type { User } from '@/types';

interface LoginParams {
  email: string;
  password: string;
}

interface OnboardParams {
  church_name: string;
  church_subdomain: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
  registration_key: string;
}

interface RegisterParams {
  church_id: number | string;
  email: string;
  password: string;
  full_name: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  return useAuthValue();
});

function useAuthValue() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        const userData = await SecureStore.getItemAsync('user_data');
        if (token && userData) {
          const parsed = JSON.parse(userData) as User;
          setUser(parsed);
          setIsAuthenticated(true);
          console.log('[Auth] Restored session for:', parsed.full_name);
        }
      } catch (e) {
        console.log('[Auth] Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    void loadUser();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (params: LoginParams) => {
      const data = await api.post<{ access_token: string; refresh_token: string; user: User }>(
        '/auth/login',
        params as unknown as Record<string, unknown>,
        { noAuth: true }
      );
      return data;
    },
    onSuccess: async (data) => {
      console.log('[Auth] Login response keys:', Object.keys(data));
      await setTokens(data.access_token, data.refresh_token);
      const userStr = JSON.stringify(data.user ?? {});
      console.log('[Auth] Storing user_data, length:', userStr.length);
      await SecureStore.setItemAsync('user_data', userStr);
      setUser(data.user);
      setIsAuthenticated(true);
      console.log('[Auth] Login successful:', data.user?.full_name);
    },
    onError: (error) => {
      console.log('[Auth] Login failed:', error.message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (params: RegisterParams) => {
      const payload = {
        church_id: params.church_id,
        email: params.email,
        password: params.password,
        full_name: params.full_name,
        role: 'member',
      };
      await api.post('/auth/register', payload as unknown as Record<string, unknown>, { noAuth: true });
      console.log('[Auth] Registration successful, auto-logging in...');
      const loginData = await api.post<{ access_token: string; refresh_token: string; user: User }>(
        '/auth/login',
        { email: params.email, password: params.password } as unknown as Record<string, unknown>,
        { noAuth: true }
      );
      return loginData;
    },
    onSuccess: async (data) => {
      console.log('[Auth] Register+Login response keys:', Object.keys(data));
      await setTokens(data.access_token, data.refresh_token);
      const userStr = JSON.stringify(data.user ?? {});
      console.log('[Auth] Storing user_data, length:', userStr.length);
      await SecureStore.setItemAsync('user_data', userStr);
      setUser(data.user);
      setIsAuthenticated(true);
      console.log('[Auth] Register+Login successful:', data.user?.full_name);
    },
    onError: (error) => {
      console.log('[Auth] Register failed:', error.message);
    },
  });

  const onboardMutation = useMutation({
    mutationFn: async (params: OnboardParams) => {
      const payload = {
        church: {
          name: params.church_name,
          subdomain: params.church_subdomain,
        },
        admin_email: params.admin_email,
        admin_name: params.admin_name,
        admin_password: params.admin_password,
        registration_key: params.registration_key,
      };
      const data = await api.post<{ access_token: string; refresh_token: string; user: User }>(
        '/churches/onboard',
        payload as unknown as Record<string, unknown>,
        { noAuth: true }
      );
      return data;
    },
    onSuccess: async (data) => {
      console.log('[Auth] Onboard response keys:', Object.keys(data));
      await setTokens(data.access_token, data.refresh_token);
      const userStr = JSON.stringify(data.user ?? {});
      console.log('[Auth] Storing user_data, length:', userStr.length);
      await SecureStore.setItemAsync('user_data', userStr);
      setUser(data.user);
      setIsAuthenticated(true);
      console.log('[Auth] Onboard successful:', data.user?.full_name);
    },
  });

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    queryClient.clear();
    console.log('[Auth] Logged out');
  }, [queryClient]);

  const isAdmin = user?.role === 'admin' || user?.role === 'pastor';
  const isPastor = user?.role === 'pastor';

  return useMemo(() => ({
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    isPastor,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error?.message ?? null,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error?.message ?? null,
    isRegistering: registerMutation.isPending,
    onboard: onboardMutation.mutateAsync,
    onboardError: onboardMutation.error?.message ?? null,
    isOnboarding: onboardMutation.isPending,
    logout,
  }), [user, isLoading, isAuthenticated, isAdmin, isPastor, loginMutation, registerMutation, onboardMutation, logout]);
}
