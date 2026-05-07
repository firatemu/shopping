import axios from 'axios';

/**
 * Geliştirme varsayılanı: tarayıcı doğrudan Nest’e gider; API ayaktayken Next proxy kaynaklı 502 önlenir.
 *
 * Next üzerinden proxy: `NEXT_PUBLIC_USE_DEV_API_PROXY=1` ve `NEXT_PUBLIC_API_URL=/api/v1`
 * (`API_DEV_PROXY_TARGET` route + next.config uploads için gerekir).
 *
 * Tam URL verirseniz (örn. `http://127.0.0.1:4000/api/v1`) olduğu gibi kullanılır.
 */
function resolveApiBase(): string {
    const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '') ?? '';
    const isDev = process.env.NODE_ENV === 'development';
    const fallbackProd = 'http://localhost:4000/api/v1';
    const devProxyPath = '/api/v1';
    const port = process.env.NEXT_PUBLIC_API_PORT ?? '4000';
    const useDevProxy = process.env.NEXT_PUBLIC_USE_DEV_API_PROXY === '1';

    if (!raw) {
        if (!isDev) return fallbackProd;
        if (useDevProxy) return devProxyPath;
        return `http://127.0.0.1:${port}/api/v1`;
    }

    if (isDev && raw === devProxyPath && !useDevProxy) {
        return `http://127.0.0.1:${port}/api/v1`;
    }

    return raw;
}

const API_BASE = resolveApiBase();

export const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, '');

/** Sunucudan dönen yükleme yolu (örn. /uploads/products/...) için tarayıcıda kullanılabilir tam URL. */
export function publicFileUrl(path: string | null | undefined): string | null {
    if (path == null || path === '') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (process.env.NODE_ENV === 'development') return path.startsWith('/') ? path : `/${path}`;
    const base = apiOrigin;
    if (base) return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    return path.startsWith('/') ? path : `/${path}`;
}

export const api = axios.create({
    baseURL: API_BASE,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject JWT + tenant header
api.interceptors.request.use((config) => {
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

// Response interceptor: handle 401
api.interceptors.response.use(
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

export const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
};

export const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    try {
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        }).format(new Date(date));
    } catch {
        return '—';
    }
};

/** Download a protected file (Excel/PDF) using the same JWT + tenant headers as JSON calls. */
export async function downloadAuthenticatedFile(
    path: string,
    options?: { params?: Record<string, string | undefined>; filenameFallback?: string },
): Promise<void> {
    const res = await api.get(path, {
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
