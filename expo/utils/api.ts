import * as SecureStore from 'expo-secure-store';

const BASE_URL = '';
const API_URL = '';

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('access_token');
  } catch {
    return null;
  }
}

async function setTokens(access: unknown, refresh: unknown): Promise<void> {
  try {
    const accessStr = typeof access === 'string' ? access : (access != null ? JSON.stringify(access) : '');
    const refreshStr = typeof refresh === 'string' ? refresh : (refresh != null ? JSON.stringify(refresh) : '');
    await SecureStore.setItemAsync('access_token', accessStr);
    await SecureStore.setItemAsync('refresh_token', refreshStr);
  } catch (e) {
    console.log('[SecureStore] Failed to store tokens:', e);
  }
}

async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('user_data');
  } catch (e) {
    console.log('Failed to clear tokens:', e);
  }
}

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

async function apiRequest<T>(endpoint: string, _options: RequestOptions = {}): Promise<T> {
  console.log(`[API-Mock] ${_options.method ?? 'GET'} ${endpoint} (no backend connected)`);
  return [] as unknown as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body }),
  put: <T>(endpoint: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body }),
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
  }
  return [];
}

function extractObject<T>(raw: unknown): T | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') return obj.data as T;
  if (obj.id != null) return raw as T;
  return raw as T;
}

export { getToken, setTokens, clearTokens, API_URL, BASE_URL, extractArray, extractObject };
