import { getSession } from './session'

// In-memory rate limiter per IP
// Resets when serverless instance recycles — fine for personal use
import { kv } from '@vercel/kv'

export async function checkRateLimit(ip) {
  const key = `rl:${ip}`
  const count = await kv.incr(key)
  if (count === 1) await kv.expire(key, WINDOW_MS / 1000)
  if (count > MAX_ATTEMPTS) {
    await kv.expire(key, LOCKOUT_MS / 1000)
    return { allowed: false, locked: true }
  }
  return { allowed: true }
}

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes lockout after max attempts

export function checkRateLimit(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 }

  // Still locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const remaining = Math.ceil((entry.lockedUntil - now) / 60000)
    return { allowed: false, remaining, locked: true }
  }

  // Reset window if expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 })
    return { allowed: true }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
    loginAttempts.set(ip, entry)
    return { allowed: false, remaining: 30, locked: true }
  }

  entry.count += 1
  loginAttempts.set(ip, entry)
  return { allowed: true, attemptsLeft: MAX_ATTEMPTS - entry.count }
}

export function recordFailedAttempt(ip) {
  const now = Date.now()
  const entry = loginAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: 0 }
  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 })
    return
  }
  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
  }
  loginAttempts.set(ip, entry)
}

export function resetAttempts(ip) {
  loginAttempts.delete(ip)
}

// Constant-time string comparison to prevent timing attacks
import crypto from 'crypto'

export function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Compare against a dummy of same length to maintain constant time
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }
  return crypto.timingSafeEqual(bufA, bufB)
}

// API route wrapper — returns 401 if not authenticated
export function withAuth(handler) {
  return async (req, res) => {
    const session = await getSession(req, res)
    if (!session?.user?.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    req.session = session
    return handler(req, res)
  }
}

// getServerSideProps wrapper — redirects to /login if not authenticated
export function requireAuth(gssp) {
  return async (context) => {
    const session = await getSession(context.req, context.res)
    if (!session?.user?.authenticated) {
      return { redirect: { destination: '/login', permanent: false } }
    }
    if (gssp) return gssp(context, session)
    return { props: {} }
  }
}
