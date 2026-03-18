import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];
const DISABLE_HTTPS_REDIRECT = process.env.DISABLE_HTTPS_REDIRECT === "true";
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_READ = 3000;
const RATE_LIMIT_WRITE = 300;

type RateBucket = {
  count: number;
  resetAt: number;
};

const rateLimitStore = (() => {
  const g = globalThis as typeof globalThis & { __apiRateLimitStore?: Map<string, RateBucket> };
  if (!g.__apiRateLimitStore) g.__apiRateLimitStore = new Map<string, RateBucket>();
  return g.__apiRateLimitStore;
})();

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function resolveAllowedOrigin(req: NextRequest, origin: string | null): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.length > 0) {
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  }
  return origin === req.nextUrl.origin ? origin : null;
}

function getRateLimit(req: NextRequest): number {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return RATE_LIMIT_WRITE;
  return RATE_LIMIT_READ;
}

function consumeRateLimit(req: NextRequest): { allowed: boolean; remaining: number; reset: number } {
  const now = Date.now();
  if (rateLimitStore.size > 10_000) {
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt <= now) rateLimitStore.delete(k);
    }
  }

  const key = `${clientIp(req)}:${req.method}:${req.nextUrl.pathname}`;
  const existing = rateLimitStore.get(key);
  const resetAt = existing && existing.resetAt > now ? existing.resetAt : now + RATE_LIMIT_WINDOW_MS;
  const currentCount = existing && existing.resetAt > now ? existing.count : 0;
  const nextCount = currentCount + 1;
  const limit = getRateLimit(req);
  rateLimitStore.set(key, { count: nextCount, resetAt });
  return {
    allowed: nextCount <= limit,
    remaining: Math.max(0, limit - nextCount),
    reset: Math.ceil(resetAt / 1000),
  };
}

function applySecurityHeaders(res: NextResponse, isHttps: boolean) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "no-referrer");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (isHttps) {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

export function middleware(req: NextRequest) {
  const hostname = req.nextUrl.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const forwardedProto = req.headers.get("x-forwarded-proto");
  // 允许通过环境变量禁用 HTTPS 强制跳转（用于 Docker 内网部署等场景）
  if (!DISABLE_HTTPS_REDIRECT && !isLocal && forwardedProto === "http") {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const origin = req.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(req, origin);
  const requestId = req.headers.get("x-request-id")?.slice(0, 64) || crypto.randomUUID();
  const isHttps = req.nextUrl.protocol === "https:" || forwardedProto === "https";

  if (origin && !allowedOrigin) {
    const denied = NextResponse.json(
      { ok: false, error: "Origin not allowed", fix: "Add origin to ALLOWED_ORIGINS.", detail: { requestId } },
      { status: 403 },
    );
    denied.headers.set("x-request-id", requestId);
    denied.headers.set("x-api-version", "1");
    applySecurityHeaders(denied, isHttps);
    return denied;
  }

  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (allowedOrigin) {
      res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, x-request-id");
      res.headers.set("Access-Control-Expose-Headers", "x-request-id, x-api-version");
      res.headers.set("Access-Control-Max-Age", "600");
      res.headers.set("Vary", "Origin");
    }
    res.headers.set("x-request-id", requestId);
    res.headers.set("x-api-version", "1");
    applySecurityHeaders(res, isHttps);
    return res;
  }

  const rate = consumeRateLimit(req);
  if (!rate.allowed) {
    const limited = NextResponse.json(
      { ok: false, error: "Too Many Requests", fix: "Retry after a short delay.", detail: { requestId } },
      { status: 429 },
    );
    if (allowedOrigin) {
      limited.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      limited.headers.set("Access-Control-Expose-Headers", "x-request-id, x-api-version");
      limited.headers.set("Vary", "Origin");
    }
    limited.headers.set("x-request-id", requestId);
    limited.headers.set("x-api-version", "1");
    limited.headers.set("RateLimit-Limit", String(getRateLimit(req)));
    limited.headers.set("RateLimit-Remaining", String(rate.remaining));
    limited.headers.set("RateLimit-Reset", String(rate.reset));
    applySecurityHeaders(limited, isHttps);
    return limited;
  }

  const res = NextResponse.next();
  if (allowedOrigin) {
    res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    res.headers.set("Access-Control-Expose-Headers", "x-request-id, x-api-version");
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("x-request-id", requestId);
  res.headers.set("x-api-version", "1");
  res.headers.set("RateLimit-Limit", String(getRateLimit(req)));
  res.headers.set("RateLimit-Remaining", String(rate.remaining));
  res.headers.set("RateLimit-Reset", String(rate.reset));
  applySecurityHeaders(res, isHttps);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
