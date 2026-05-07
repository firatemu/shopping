import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveApiDevProxyTarget } from '@/lib/dev-upstream';

/**
 * Geliştirme: tarayıcı `/api/v1/*` isteğini Nest’e iletir. `next.config` rewrite’ından farklı olarak
 * upstream kapalıysa net 502 + Türkçe mesaj döner (rewrite genelde 500 üretir).
 *
 * Yanıtı `arrayBuffer` ile tamponlamak: bazı ortamlarda `new NextResponse(upstream.body)` stream
 * aktarımı Next içinde 500 düz metin üretebiliyor.
 */
export const dynamic = 'force-dynamic';

const PROXY_DIAGNOSTIC_HEADER = 'x-textilepos-proxy';

const UPSTREAM = resolveApiDevProxyTarget();

const IS_DEV = process.env.NODE_ENV === 'development';

const HOP_BY_HEADER = new Set([
    'connection',
    'keep-alive',
    'proxy-connection',
    'transfer-encoding',
    'te',
    'trailer',
    'upgrade',
]);

/** İstek: `content-length` / `host` fetch tarafından gövde ve URL’ye göre doğru ayarlanmalı. */
function forwardRequestHeaders(incoming: Headers): Headers {
    const out = new Headers();
    incoming.forEach((value, key) => {
        const k = key.toLowerCase();
        if (HOP_BY_HEADER.has(k)) return;
        if (k === 'content-length' || k === 'host') return;
        out.append(key, value);
    });
    return out;
}

function copyUpstreamResponseHeaders(upstream: Response): Headers {
    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
        const k = key.toLowerCase();
        if (HOP_BY_HEADER.has(k)) return;
        if (k === 'set-cookie') {
            resHeaders.append(key, value);
        } else {
            resHeaders.set(key, value);
        }
    });
    resHeaders.set(PROXY_DIAGNOSTIC_HEADER, '1');
    return resHeaders;
}

const GATEWAY_MESSAGE =
    'API sunucusuna bağlanılamıyor. Kök dizinde `npm run dev:api` veya `npm run dev:all` çalıştırın (Nest varsayılan :4000). ' +
    'Port farklıysa `API_PORT` veya `API_DEV_PROXY_TARGET` ayarlayın; `.env.local` değişince Next’i yeniden başlatın. ' +
    'Docker compose: `API_DEV_PROXY_TARGET=http://api:4000`. Hibrit (web konteyner, API host’ta): `API_DEV_PROXY_TARGET=http://host.docker.internal:<port>`. ' +
    '502 gövdesindeki `details` ağ hatasına bakın.';

/** compose servis adı `api` yalnızca köprü ağı içinde çözülür; host’ta çalışan Next bu yüzden sürekli `fetch failed` üretir. */
function dockerServiceHostnameHint(upstream: string): string | undefined {
    try {
        const hostname = new URL(upstream).hostname.toLowerCase();
        if (hostname === 'api') {
            return 'Proxy hedefi `http://api:...` görünüyor — bu adres yalnızca Docker ağı içindedir. Next’i WSL/ana makinede çalıştırıyorsanız `.env.local` içinde `API_DEV_PROXY_TARGET=http://127.0.0.1:4000` (veya API’nin dinlediği port) yapın ve Next’i yeniden başlatın.';
        }
    } catch {
        /* ignore */
    }
    return undefined;
}

async function proxy(req: NextRequest, pathSegments: string[] | undefined): Promise<Response> {
    if (!IS_DEV) {
        return NextResponse.json(
            { statusCode: 404, error: 'Not Found', message: 'Not Found' },
            { status: 404, headers: { [PROXY_DIAGNOSTIC_HEADER]: '1' } },
        );
    }

    const path = (pathSegments ?? []).join('/');
    const url = new URL(req.url);
    const dest = `${UPSTREAM}/api/v1/${path}${url.search}`;

    let body: ArrayBuffer | undefined;
    try {
        const hasBody = !['GET', 'HEAD'].includes(req.method);
        if (hasBody) {
            body = await req.arrayBuffer();
        }

        let upstream: Response;
        try {
            upstream = await fetch(dest, {
                method: req.method,
                headers: forwardRequestHeaders(req.headers),
                body: body && body.byteLength > 0 ? body : undefined,
            });
        } catch (fetchErr) {
            const detail =
                fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            const hint = IS_DEV ? dockerServiceHostnameHint(UPSTREAM) : undefined;
            console.error('[SoftShopping API proxy] fetch failed:', dest, detail);
            return NextResponse.json(
                {
                    statusCode: 502,
                    error: 'Bad Gateway',
                    message: GATEWAY_MESSAGE,
                    ...(IS_DEV
                        ? {
                              upstream: UPSTREAM,
                              details: detail,
                              phase: 'fetch' as const,
                              ...(hint ? { hint } : {}),
                          }
                        : {}),
                },
                { status: 502, headers: { [PROXY_DIAGNOSTIC_HEADER]: '1' } },
            );
        }

        let bytes: ArrayBuffer;
        try {
            bytes = await upstream.arrayBuffer();
        } catch (bufErr) {
            const detail = bufErr instanceof Error ? bufErr.message : String(bufErr);
            console.error('[SoftShopping API proxy] response body read failed:', dest, detail);
            return NextResponse.json(
                {
                    statusCode: 502,
                    error: 'Bad Gateway',
                    message: GATEWAY_MESSAGE,
                    ...(IS_DEV
                        ? {
                              upstream: UPSTREAM,
                              details: detail,
                              phase: 'upstream_body' as const,
                          }
                        : {}),
                },
                { status: 502, headers: { [PROXY_DIAGNOSTIC_HEADER]: '1' } },
            );
        }

        const resHeaders = copyUpstreamResponseHeaders(upstream);

        return new NextResponse(bytes, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: resHeaders,
        });
    } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error('[SoftShopping API proxy] upstream failed:', dest, detail);
        return NextResponse.json(
            {
                statusCode: 502,
                error: 'Bad Gateway',
                message: GATEWAY_MESSAGE,
                ...(IS_DEV ? { upstream: UPSTREAM, details: detail, phase: 'proxy' as const } : {}),
            },
            { status: 502, headers: { [PROXY_DIAGNOSTIC_HEADER]: '1' } },
        );
    }
}

type RouteCtx = { params: Promise<{ path?: string[] }> | { path?: string[] } };

/**
 * `ctx.params` bazı ortamlarda Promise, bazılarında düz nesne olabilir; `ctx.params.then` düz nesnede
 * TypeError üretir ve Next düz metin 500 döner. `Promise.resolve` her iki şekli de güvenli işler.
 */
async function handle(req: NextRequest, ctx: RouteCtx): Promise<Response> {
    try {
        const p = await Promise.resolve(ctx.params);
        return await proxy(req, p.path);
    } catch {
        return NextResponse.json(
            {
                statusCode: 502,
                error: 'Bad Gateway',
                message: GATEWAY_MESSAGE,
            },
            { status: 502, headers: { [PROXY_DIAGNOSTIC_HEADER]: '1' } },
        );
    }
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}

export async function OPTIONS(req: NextRequest, ctx: RouteCtx) {
    return handle(req, ctx);
}
