import { sql } from '../../../lib/db'
import { withAuth } from '../../../lib/auth'
import { KOLOM, keJson, bersihkan } from '../../../lib/jobs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function handler(req, res) {
  const { id } = req.query
  if (!UUID.test(id)) return res.status(404).json({ error: 'Tidak ditemukan' })

  try {
    if (req.method === 'GET') {
      const baris = await sql`select ${KOLOM} from job_applications where id = ${id}`
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json(keJson(baris[0]))
    }

    if (req.method === 'PUT') {
      const lama = await sql`select ${KOLOM} from job_applications where id = ${id}`
      if (!lama.length) return res.status(404).json({ error: 'Tidak ditemukan' })

      const d = bersihkan(req.body || {}, keJson(lama[0]))
      const baris = await sql`
        update job_applications set
          perusahaan    = ${d.perusahaan},
          lokasi        = ${d.lokasi},
          jabatan       = ${d.jabatan},
          jenis         = ${d.jenis},
          tempat        = ${d.tempat},
          status        = ${d.status},
          tanggal_apply = ${d.tanggalApply},
          deadline      = ${d.deadline},
          referensi     = ${d.referensi},
          url           = ${d.url},
          gaji          = ${d.gaji},
          catatan       = ${d.catatan},
          sumber        = ${d.sumber},
          updated_at    = now()
        where id = ${id}
        returning ${KOLOM}
      `
      return res.json(keJson(baris[0]))
    }

    if (req.method === 'DELETE') {
      const baris = await sql`delete from job_applications where id = ${id} returning id`
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT, DELETE')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('jobs/[id]:', e)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
