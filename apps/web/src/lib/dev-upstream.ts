/**
 * Nest tabanı (geliştirme): Next API route proxy ve `next.config` /uploads rewrite.
 * Öncelik: API_DEV_PROXY_TARGET; yoksa http://127.0.0.1:$API_PORT (API_PORT yoksa 4000).
 */
export function resolveApiDevProxyTarget(): string {
    const raw = process.env.API_DEV_PROXY_TARGET?.trim();
    if (raw) {
        return raw.replace(/\/$/, '');
    }
    const port = process.env.API_PORT ?? '4000';
    return `http://127.0.0.1:${port}`;
}
