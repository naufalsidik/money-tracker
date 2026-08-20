import { withAuth } from '../../../../lib/auth'
import { sql, toNumber } from '../../../../lib/db'
import { isValidId } from '../../../../lib/validation'

async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const d = req.body || {}
      const dari = parseInt(d.dariId, 10)
      const ke = parseInt(d.keId, 10)
      const jumlah = Math.round(Number(d.amount))

      if (!isValidId(dari) || !isValidId(ke)) return res.status(400).json({ error: 'Dompet tidak valid' })
      if (dari === ke) return res.status(400).json({ error: 'Dompet asal dan tujuan tidak boleh sama' })
      if (!Number.isFinite(jumlah) || jumlah <= 0) return res.status(400).json({ error: 'Jumlah harus positif' })
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal || ''))) return res.status(400).json({ error: 'Tanggal tidak valid' })

      const baris = await sql`
        insert into wallet_transfers (tanggal, dari_id, ke_id, amount, catatan)
        values (${d.tanggal}, ${dari}, ${ke}, ${jumlah}, ${String(d.catatan || '').trim()})
        returning id
      `
      return res.status(201).json({ id: Number(baris[0].id) })
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id, 10)
      if (!isValidId(id)) return res.status(400).json({ error: 'Id tidak valid' })
      const baris = await sql`delete from wallet_transfers where id = ${id} returning id`
      if (!baris.length) return res.status(404).json({ error: 'Tidak ditemukan' })
      return res.json({ ok: true })
    }

    res.setHeader('Allow', 'POST, DELETE')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[transfers]', e.message)
    return res.status(500).json({ error: 'Gagal memproses transfer' })
  }
}

export default withAuth(handler)
