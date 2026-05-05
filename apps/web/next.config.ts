import type { NextConfig } from "next";

/** Next dev server proxies same-origin /api/v1 → Nest (avoids browser hitting :4000 directly). */
const API_DEV_PROXY_TARGET =
  process.env.API_DEV_PROXY_TARGET ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }
    const base = API_DEV_PROXY_TARGET.replace(/\/$/, "");
    return [
      {
        source: "/api/v1/:path*",
        destination: `${base}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
