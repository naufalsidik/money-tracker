import { getSession } from '../../lib/session'
import { checkRateLimit, recordFailedAttempt, resetAttempts, safeCompare } from '../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Origin check untuk login endpoint
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin && host) {
    try {
      const originHost = new URL(origin).host
      if (originHost !== host) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

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

  // Validasi input dasar
  if (typeof username !== 'string' || typeof pin !== 'string' && typeof pin !== 'number') {
    return res.status(400).json({ error: 'Format input tidak valid.' })
  }

  if (username.length > 100 || String(pin).length > 100) {
    return res.status(400).json({ error: 'Input terlalu panjang.' })
  }

  const expectedUsername = process.env.AUTH_USERNAME || ''
  const expectedPin = process.env.AUTH_PIN || ''

  if (!expectedUsername || !expectedPin) {
    console.error('[login] AUTH_USERNAME atau AUTH_PIN tidak di-set di env')
    return res.status(500).json({ error: 'Konfigurasi server tidak lengkap.' })
  }

  // Constant-time compare untuk kedua field
  const usernameMatch = safeCompare(username.trim(), expectedUsername)
  const pinMatch = safeCompare(String(pin).trim(), expectedPin)

  if (!usernameMatch || !pinMatch) {
    recordFailedAttempt(ip)
    // Pesan error generic — jangan reveal field mana yang salah
    return res.status(401).json({ error: 'Username atau PIN salah.' })
  }

  // Success — reset rate limit dan set session
  resetAttempts(ip)
  const session = await getSession(req, res)
  session.user = { authenticated: true, loginAt: Date.now() }
  await session.save()

  return res.json({ success: true })
}
