import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── In-memory fallback for local dev (single instance only) ──────────────────
const memStore = new Map<string, { count: number; reset: number }>();

function memLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.reset) { memStore.set(key, { count: 1, reset: now + windowMs }); return true; }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Upstash Redis (production) ────────────────────────────────────────────────
function msToUpstashDuration(ms: number): `${number} ${"ms" | "s" | "m" | "h" | "d"}` {
  if (ms < 60_000)     return `${Math.round(ms / 1_000)} s`;
  if (ms < 3_600_000)  return `${Math.round(ms / 60_000)} m`;
  return `${Math.round(ms / 3_600_000)} h`;
}

let _redis: Redis | null = null;
const _limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  if (!_limiters.has(cacheKey)) {
    if (!_redis) {
      _redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
    }
    _limiters.set(cacheKey, new Ratelimit({
      redis: _redis,
      limiter: Ratelimit.slidingWindow(limit, msToUpstashDuration(windowMs)),
      analytics: false,
    }));
  }
  return _limiters.get(cacheKey)!;
}

/**
 * Returns true if the request is allowed, false if it should be rate limited.
 * Falls back to in-memory when Upstash env vars are absent (dev mode).
 * Fails open on Redis errors to avoid blocking legitimate users.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return memLimit(key, limit, windowMs);
  }
  try {
    const { success } = await getLimiter(limit, windowMs).limit(key);
    return success;
  } catch {
    return memLimit(key, limit, windowMs); // Redis failure → fail open
  }
}
