import axios from 'axios';

const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ??
    (process.env.NODE_ENV === 'development'
        ? '/api/v1'
        : 'http://localhost:4000/api/v1');

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
            window.location.href = '/login';
        }
        return Promise.reject(err);
    },
);

export const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
};

export const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(date));
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
