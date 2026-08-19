import { sql } from '../../../lib/db'
import { withJobsAuth } from '../../../lib/jobs-auth'
import { STATUS } from '../../../lib/jobs'

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  }

  try {
    const [r] = await sql`
      select
        count(*)::int as total,
        count(*) filter (where tanggal_apply >= current_date - 7)::int as minggu_ini,
        count(*) filter (where status not in ('Rejected','Ghosted'))::int as aktif,
        count(*) filter (where status in ('Interview','Offer'))::int as interview,
        count(*) filter (where status in ('Screening','Interview','Offer','Rejected'))::int as direspons
      from job_applications
    `
    const perStatus = await sql`
      select status, count(*)::int as jumlah from job_applications group by status
    `

    const byStatus = {}
    for (const s of STATUS) byStatus[s] = 0
    for (const b of perStatus) byStatus[b.status] = b.jumlah

    return res.json({
      total: r.total,
      mingguIni: r.minggu_ini,
      aktif: r.aktif,
      interview: r.interview,
      responseRate: r.total ? Math.round((r.direspons / r.total) * 100) : 0,
      byStatus,
    })
  } catch (e) {
    console.error('jobs/stats:', e)
    return res.status(500).json({ error: 'Gagal membaca ringkasan' })
  }
}

export default withJobsAuth(handler)
