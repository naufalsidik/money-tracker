import { withAuth } from '../../../../lib/auth'
import { sql } from '../../../../lib/db'
import { isValidId } from '../../../../lib/validation'
import { periodeUntukTanggal } from '../../../../lib/periods'
import { KATEGORI_BIAYA_ADMIN } from '../../../../lib/constants'

async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const d = req.body || {}
      const dari = parseInt(d.dariId, 10)
      const ke = parseInt(d.keId, 10)
      const jumlah = Math.round(Number(d.amount))
      const biaya = Math.round(Number(d.fee) || 0)

      if (!isValidId(dari) || !isValidId(ke)) return res.status(400).json({ error: 'Dompet tidak valid' })
      if (dari === ke) return res.status(400).json({ error: 'Dompet asal dan tujuan tidak boleh sama' })
      if (!Number.isFinite(jumlah) || jumlah <= 0) return res.status(400).json({ error: 'Jumlah harus positif' })
      if (!Number.isFinite(biaya) || biaya < 0 || biaya > 1_000_000) return res.status(400).json({ error: 'Biaya admin tidak wajar' })
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal || ''))) return res.status(400).json({ error: 'Tanggal tidak valid' })

      const [baris] = await sql`
        insert into wallet_transfers (tanggal, dari_id, ke_id, amount, fee, catatan)
        values (${d.tanggal}, ${dari}, ${ke}, ${jumlah}, ${biaya}, ${String(d.catatan || '').trim()})
        returning id
      `

      // Biaya nol tidak menghasilkan baris apa pun. Transfer sesama bank
      // sering gratis, dan baris Rp0 cuma menambah sampah di daftar
      // pengeluaran tanpa memberi informasi.
      if (biaya > 0) {
        // Periode diambil dari tanggal transfer, bukan periode yang sedang
        // dibuka di layar. Transfer tanggal 15 Agustus masuk periode Juli.
        const p = periodeUntukTanggal(d.tanggal)
        if (p) {
          const [w1] = await sql`select nama from wallets where id = ${dari}`
          const [w2] = await sql`select nama from wallets where id = ${ke}`
          const ket = `Biaya admin transfer ${w1?.nama || '?'} ke ${w2?.nama || '?'}`

          await sql`
            insert into variable_expenses
              (month, year, tanggal, description, category, amount, wallet_id, transfer_id)
            values
              (${p.month}, ${p.year}, ${d.tanggal}, ${ket},
               ${KATEGORI_BIAYA_ADMIN}, ${biaya}, ${dari}, ${baris.id})
          `
        }
      }

      return res.status(201).json({ id: Number(baris.id) })
    }

    if (req.method === 'DELETE') {
      const id = parseInt(req.query.id, 10)
      if (!isValidId(id)) return res.status(400).json({ error: 'Id tidak valid' })
      // Baris biaya adminnya ikut terhapus lewat ON DELETE CASCADE.
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
