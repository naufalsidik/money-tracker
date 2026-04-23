import { getSession } from '../../lib/session'
import { checkRateLimit, recordFailedAttempt, resetAttempts, safeCompare } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'

  // Rate limit check
  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return res.status(429).json({
      error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.remaining} menit.`
    })
  }

  const { username, pin } = req.body || {}

  if (!username || !pin) {
    return res.status(400).json({ error: 'Username dan PIN wajib diisi.' })
  }

  const expectedUsername = process.env.AUTH_USERNAME || ''
  const expectedPin = process.env.AUTH_PIN || ''

  // Constant-time compare for both fields
  const usernameMatch = safeCompare(username.trim(), expectedUsername)
  const pinMatch = safeCompare(String(pin).trim(), expectedPin)

  if (!usernameMatch || !pinMatch) {
    recordFailedAttempt(ip)
    // Generic error — don't reveal which field is wrong
    return res.status(401).json({ error: 'Username atau PIN salah.' })
  }

  // Success — clear rate limit and set session
  resetAttempts(ip)
  const session = await getSession(req, res)
  session.user = { authenticated: true, loginAt: Date.now() }
  await session.save()

  return res.json({ success: true })
}
