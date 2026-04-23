import { getSession } from '../../lib/session'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Origin check
  const origin = req.headers.origin
  const host = req.headers.host
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

  const session = await getSession(req, res)
  session.destroy()
  res.json({ success: true })
}
