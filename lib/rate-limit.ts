type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

declare global {
  var __hinilasRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = globalThis.__hinilasRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__hinilasRateLimitStore = store;

export function getRequestIp(request: { headers: Headers | { get(name: string): string | null } }) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1, retryAfterMs: windowMs };
  }

  if (entry.count >= limit) {
    return {
      ok: false as const,
      remaining: 0,
      retryAfterMs: Math.max(0, entry.resetAt - now),
    };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    ok: true as const,
    remaining: Math.max(0, limit - entry.count),
    retryAfterMs: Math.max(0, entry.resetAt - now),
  };
}
