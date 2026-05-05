import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { authStorage } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const apiBaseUrl = API_BASE_URL;
export const apiOrigin = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

/**
 * SSL pinning: Expo/React Native için pinning üretimde okhttp/Cronet (Android) ve
 * NSURLSession delegate (iOS) ile yapılmalı; axios tabanı tek başına sertifika sabitlemez.
 * EAS build sırasında özel native modül veya güvenilir üçüncü parti çözüm önerilir.
 */

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export class ConnectionRequiredError extends Error {
  constructor() {
    super('Bağlantı gerekli. Lütfen internet bağlantınızı kontrol edin.');
    this.name = 'ConnectionRequiredError';
  }
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function getApiErrorMessage(error: unknown, fallback = 'Bir hata oluştu'): string {
  if (error instanceof ConnectionRequiredError) return error.message;

  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const netState = await NetInfo.fetch();
  if (netState.isConnected === false || netState.isInternetReachable === false) {
    throw new ConnectionRequiredError();
  }

  const accessToken = authStorage.getAccessToken();
  const tenantId = authStorage.getTenantId();

  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (tenantId) config.headers['x-tenant-id'] = tenantId;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const ax = error as AxiosError;
    const status = ax.response?.status;
    const original = ax.config as (InternalAxiosRequestConfig & { __tpRetry?: boolean }) | undefined;

    if (status !== 401 || !original || original.__tpRetry) {
      if (status === 401) {
        authStorage.clear();
        unauthorizedHandler?.();
      }
      return Promise.reject(error);
    }

    const path = `${original.baseURL ?? ''}${original.url ?? ''}`;
    if (path.includes('/auth/login') || path.includes('/auth/refresh')) {
      authStorage.clear();
      unauthorizedHandler?.();
      return Promise.reject(error);
    }

    const refresh = authStorage.getRefreshToken();
    if (!refresh) {
      authStorage.clear();
      unauthorizedHandler?.();
      return Promise.reject(error);
    }

    try {
      const tid = authStorage.getTenantId();
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
        user: { tenantId: string };
      }>(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken: refresh },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(tid ? { 'x-tenant-id': tid } : {}),
          },
        },
      );
      authStorage.setAccessToken(data.accessToken);
      authStorage.setRefreshToken(data.refreshToken);
      original.__tpRetry = true;
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api.request(original);
    } catch {
      authStorage.clear();
      unauthorizedHandler?.();
      return Promise.reject(error);
    }
  },
);

export function publicFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${apiOrigin.replace(/\/$/, '')}${normalized}`;
}
