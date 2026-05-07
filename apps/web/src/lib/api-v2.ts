/**
 * API v2 client preparation.
 * This file provides a typed client for upcoming /api/v2 endpoints.
 * Currently unused — swap api calls to this client once v2 endpoints are available.
 *
 * Usage:
 *   import { apiV2 } from '@/lib/api-v2';
 *   const res = await apiV2.get('/products');
 */

import axios, { AxiosInstance } from 'axios';

function resolveV2Base(): string {
    const raw = process.env.NEXT_PUBLIC_API_V2_URL?.trim().replace(/\/$/, '');
    if (raw) return raw;
    const port = process.env.NEXT_PUBLIC_API_PORT ?? '4000';
    return process.env.NODE_ENV === 'development'
        ? `http://127.0.0.1:${port}/api/v2`
        : `http://localhost:${port}/api/v2`;
}

const API_V2_BASE = resolveV2Base();

export const apiV2: AxiosInstance = axios.create({
    baseURL: API_V2_BASE,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

apiV2.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    if (typeof window !== 'undefined') {
        try {
            const authRaw = localStorage.getItem('textilepos-auth');
            if (authRaw) {
                const parsed = JSON.parse(authRaw);
                const token = parsed?.state?.accessToken;
                const tenantId = parsed?.state?.user?.tenantId;
                if (token) config.headers.Authorization = `Bearer ${token}`;
                if (tenantId) config.headers['x-tenant-id'] = tenantId;
            }
        } catch { /* ignore */ }
    }
    return config;
});

apiV2.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('textilepos-auth');
            localStorage.removeItem('textilepos-tabs');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    },
);

/**
 * Helper: download an authenticated file from a v2 endpoint.
 */
export async function downloadV2File(
    path: string,
    options?: { params?: Record<string, string | undefined>; filenameFallback?: string },
): Promise<void> {
    const res = await apiV2.get(path, {
        responseType: 'blob',
        params: options?.params,
    });
    const blob = res.data as Blob;
    let filename = options?.filenameFallback ?? 'download';
    const disp = res.headers['content-disposition'] as string | undefined;
    const m = disp?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
    if (m?.[1]) filename = decodeURIComponent(m[1].trim());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}