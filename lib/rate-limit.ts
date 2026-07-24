interface RateLimitEntry {
  count: number
  blockedUntil: number
}

const store = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const BLOCK_MS = 15 * 60 * 1000  // 15 minutes

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const entry = store.get(ip)

  if (entry) {
    if (now < entry.blockedUntil) {
      return { allowed: false, retryAfterMs: entry.blockedUntil - now }
    }
    if (now > entry.blockedUntil && entry.count >= MAX_ATTEMPTS) {
      // Block expired — reset
      store.delete(ip)
    }
  }

  return { allowed: true }
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = store.get(ip) ?? { count: 0, blockedUntil: 0 }

  entry.count += 1

  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS
  }

  store.set(ip, entry)

  // Cleanup stale entries periodically (simple GC)
  if (store.size > 1000) {
    for (const [key, val] of store.entries()) {
      if (now > val.blockedUntil + WINDOW_MS) store.delete(key)
    }
  }
}

export function clearFailedAttempts(ip: string): void {
  store.delete(ip)
}
