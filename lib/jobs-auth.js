import { withAuth, safeCompare } from './auth'

// Dua jalur masuk yang sah:
//   1. Cookie session — dipakai browser saat Anda buka /jobs
//   2. Header x-api-key — dipakai Claude Cowork, yang tidak punya cookie
//
// Jalur API key sengaja melewati pemeriksaan origin. Pemeriksaan itu ada
// untuk menangkal CSRF, dan CSRF hanya mungkin ketika browser melampirkan
// kredensial secara otomatis. Header kustom tidak pernah dilampirkan otomatis
// oleh browser, jadi risikonya tidak berlaku di jalur ini.
export function withJobsAuth(handler) {
  return async (req, res) => {
    const kunci = req.headers['x-api-key']

    if (typeof kunci === 'string' && kunci.length > 0) {
      const seharusnya = process.env.JOBS_API_KEY
      if (!seharusnya) {
        return res.status(500).json({ error: 'JOBS_API_KEY belum diset di server' })
      }
      if (!safeCompare(kunci, seharusnya)) {
        return res.status(401).json({ error: 'Unauthorized' })
      }
      req.viaApiKey = true
      return handler(req, res)
    }

    return withAuth(handler)(req, res)
  }
}
