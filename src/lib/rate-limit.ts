/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works for single-instance Node.js (self-hosted / Railway / Render).
 * For serverless / edge (Vercel Functions, Cloudflare Workers) replace with
 * a distributed store — e.g. @upstash/ratelimit + Upstash Redis.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

// Module-level store — persists across requests in the same Node.js process.
const store = new Map<string, WindowEntry>();

// Periodic cleanup to prevent unbounded memory growth.
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setTimeout(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt < now) store.delete(key);
    }
    cleanupTimer = null;
  }, 60_000);
}

export interface RateLimitResult {
  success: boolean;  // true → request allowed
  remaining: number; // requests left in current window
  resetAt: number;   // unix ms when the window resets
}

/**
 * Check and increment the counter for the given key.
 *
 * @param key       Unique bucket id (e.g. `${ip}:analyze`)
 * @param limit     Max requests allowed per window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  scheduleCleanup();

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    const newEntry: WindowEntry = { count: 1, resetAt: now + windowMs };
    store.set(key, newEntry);
    return { success: true, remaining: limit - 1, resetAt: newEntry.resetAt };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    success: existing.count <= limit,
    remaining,
    resetAt: existing.resetAt,
  };
}

/**
 * Extract client IP from a Next.js request.
 * Handles Vercel (.ip property), Cloudflare (cf-connecting-ip),
 * reverse proxies (x-forwarded-for), and direct connections.
 */
export function getClientIp(req: Request): string {
  // NextRequest exposes .ip directly on Vercel edge
  const ip = (req as Request & { ip?: string }).ip;
  if (ip) return ip;

  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
