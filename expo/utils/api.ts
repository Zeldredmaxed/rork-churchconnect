import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://newbirth-app-production.up.railway.app';
const API_URL = `${BASE_URL}/api/v1`;

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
    console.log('[SecureStore] Storing tokens, access length:', accessStr.length, 'refresh length:', refreshStr.length);
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

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    if (!refreshToken) return null;

    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    await setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, noAuth = false } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (!(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (!noAuth) {
    const token = await getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  console.log(`[API] ${method} ${endpoint}`);

  let res = await fetch(`${API_URL}${endpoint}`, config);

  if (res.status === 401 && !noAuth) {
    console.log('[API] Token expired, attempting refresh...');
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders['Authorization'] = `Bearer ${newToken}`;
      config.headers = requestHeaders;
      res = await fetch(`${API_URL}${endpoint}`, config);
    } else {
      await clearTokens();
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.log(`[API] Error ${res.status}:`, errorData);
    throw new Error(errorData.message || errorData.detail || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
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

export { getToken, setTokens, clearTokens, API_URL, BASE_URL };
