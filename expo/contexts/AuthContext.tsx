import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

function normalizeUser(raw: Record<string, unknown>): User {
  const toStr = (val: unknown): string => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return `${val}`;
    return '';
  };
  const fullName = toStr(raw.full_name) || toStr(raw.name) || toStr(raw.fullName);
  const normalized: User = {
    id: toStr(raw.id),
    full_name: fullName,
    email: toStr(raw.email),
    role: (raw.role ?? 'member') as User['role'],
    church_id: toStr(raw.church_id),
    phone: raw.phone as string | undefined,
    avatar_url: raw.avatar_url as string | undefined,
    username: raw.username as string | undefined,
    bio: (raw.testimony_summary ?? raw.bio) as string | undefined,
    pronouns: raw.pronouns as string | undefined,
    gender: raw.gender as string | undefined,
    link: raw.link as string | undefined,
    membership_status: raw.membership_status as string | undefined,
    created_at: raw.created_at as string | undefined,
  };
  console.log('[Auth] normalizeUser -> full_name:', normalized.full_name, 'id:', normalized.id);
  return normalized;
}

function useAuthValue() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();
  const profileFetchedRef = useRef(false);

  const fetchAndSyncProfile = useCallback(async (existingUser?: User | null) => {
    try {
      console.log('[Auth] Fetching fresh profile from API...');
      let profileData: Record<string, unknown> | null = null;

      try {
        const meResponse = await api.get<Record<string, unknown>>('/auth/me');
        console.log('[Auth] /auth/me response keys:', Object.keys(meResponse ?? {}));
        if (meResponse && typeof meResponse === 'object') {
          const data = (meResponse as Record<string, unknown>).data ?? meResponse;
          profileData = data as Record<string, unknown>;
        }
      } catch (e1) {
        console.log('[Auth] /auth/me failed, trying /members/me:', e1);
        try {
          const memberResponse = await api.get<Record<string, unknown>>('/members/me');
          console.log('[Auth] /members/me response keys:', Object.keys(memberResponse ?? {}));
          if (memberResponse && typeof memberResponse === 'object') {
            const data = (memberResponse as Record<string, unknown>).data ?? memberResponse;
            profileData = data as Record<string, unknown>;
          }
        } catch (e2) {
          console.log('[Auth] /members/me also failed:', e2);
          if (existingUser?.id) {
            try {
              const memberById = await api.get<Record<string, unknown>>(`/members/${existingUser.id}`);
              console.log('[Auth] /members/:id response keys:', Object.keys(memberById ?? {}));
              if (memberById && typeof memberById === 'object') {
                const data = (memberById as Record<string, unknown>).data ?? memberById;
                profileData = data as Record<string, unknown>;
              }
            } catch (e3) {
              console.log('[Auth] /members/:id also failed:', e3);
            }
          }
        }
      }

      if (profileData && typeof profileData === 'object' && profileData.id) {
        const merged = { ...(existingUser ?? {}), ...profileData };
        const freshUser = normalizeUser(merged as Record<string, unknown>);
        if (freshUser.full_name || freshUser.email) {
          setUser(freshUser);
          const userStr = JSON.stringify(freshUser);
          await SecureStore.setItemAsync('user_data', userStr);
          console.log('[Auth] Profile synced from API:', freshUser.full_name);
          return freshUser;
        }
      } else {
        console.log('[Auth] No valid profile data returned from API');
      }
    } catch (e) {
      console.log('[Auth] fetchAndSyncProfile error:', e);
    }
    return null;
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await SecureStore.getItemAsync('access_token');
        const userData = await SecureStore.getItemAsync('user_data');
        if (token && userData) {
          const parsed = JSON.parse(userData) as User;
          const normalized = normalizeUser(parsed as unknown as Record<string, unknown>);
          setUser(normalized);
          setIsAuthenticated(true);
          console.log('[Auth] Restored session for:', normalized.full_name);

          if (!profileFetchedRef.current) {
            profileFetchedRef.current = true;
            void fetchAndSyncProfile(normalized);
          }
        }
      } catch (e) {
        console.log('[Auth] Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    void loadUser();
  }, [fetchAndSyncProfile]);

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
      console.log('[Auth] Login user data:', JSON.stringify(data.user ?? {}).slice(0, 500));
      await setTokens(data.access_token, data.refresh_token);
      const rawUser = (data.user ?? {}) as unknown as Record<string, unknown>;
      const normalized = normalizeUser(rawUser);
      const userStr = JSON.stringify(normalized);
      console.log('[Auth] Storing user_data, length:', userStr.length);
      await SecureStore.setItemAsync('user_data', userStr);
      setUser(normalized);
      setIsAuthenticated(true);
      console.log('[Auth] Login successful:', normalized.full_name);
      profileFetchedRef.current = true;
      void fetchAndSyncProfile(normalized);
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
      console.log('[Auth] Register user data:', JSON.stringify(data.user ?? {}).slice(0, 500));
      await setTokens(data.access_token, data.refresh_token);
      const rawUser = (data.user ?? {}) as unknown as Record<string, unknown>;
      const normalized = normalizeUser(rawUser);
      const userStr = JSON.stringify(normalized);
      console.log('[Auth] Storing user_data, length:', userStr.length);
      await SecureStore.setItemAsync('user_data', userStr);
      setUser(normalized);
      setIsAuthenticated(true);
      console.log('[Auth] Register+Login successful:', normalized.full_name);
      profileFetchedRef.current = true;
      void fetchAndSyncProfile(normalized);
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
      console.log('[Auth] Onboard user data:', JSON.stringify(data.user ?? {}).slice(0, 500));
      await setTokens(data.access_token, data.refresh_token);
      const rawUser = (data.user ?? {}) as unknown as Record<string, unknown>;
      const normalized = normalizeUser(rawUser);
      const userStr = JSON.stringify(normalized);
      console.log('[Auth] Storing user_data, length:', userStr.length);
      await SecureStore.setItemAsync('user_data', userStr);
      setUser(normalized);
      setIsAuthenticated(true);
      console.log('[Auth] Onboard successful:', normalized.full_name);
      profileFetchedRef.current = true;
      void fetchAndSyncProfile(normalized);
    },
  });

  const updateUser = useCallback(async (updates: Partial<User>) => {
    const updated = { ...user, ...updates } as User;
    setUser(updated);
    const userStr = JSON.stringify(updated);
    await SecureStore.setItemAsync('user_data', userStr);
    console.log('[Auth] User data updated locally:', Object.keys(updates));
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const freshUser = await fetchAndSyncProfile(user);
      return freshUser ?? user;
    }
    return null;
  }, [user, fetchAndSyncProfile]);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setIsAuthenticated(false);
    profileFetchedRef.current = false;
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
    updateUser,
    refreshProfile,
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
  }), [user, isLoading, isAuthenticated, isAdmin, isPastor, updateUser, refreshProfile, loginMutation, registerMutation, onboardMutation, logout]);
}
