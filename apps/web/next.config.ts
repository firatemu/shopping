import type { NextConfig } from "next";
import { resolveApiDevProxyTarget } from "./src/lib/dev-upstream";

/** Statik dosyalar (uploads) için rewrite. `/api/v1` istekleri `app/api/v1/[[...path]]/route.ts` ile iletilir (502 + açıklama). */
const API_DEV_PROXY_TARGET = resolveApiDevProxyTarget();

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    const base = API_DEV_PROXY_TARGET.replace(/\/$/, "");
    return [
      {
        source: "/uploads/:path*",
        destination: `${base}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
