import { getIronSession } from 'iron-session'

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  // Kasih warning di server log saat startup kalau SESSION_SECRET tidak valid
  // iron-session akan throw error saat dipakai, tapi kita mau visibility lebih awal
  if (typeof window === 'undefined') {
    console.warn('[session] SESSION_SECRET tidak di-set atau < 32 karakter. Session tidak akan bekerja.')
  }
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'fallback-for-build-only-not-secure-minimum-32chars',
  cookieName: 'mt_sess',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 hari
  },
}

export async function getSession(req, res) {
  return getIronSession(req, res, sessionOptions)
}
