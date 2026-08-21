import { withAuth } from '../../../../lib/auth'
import { sql, toNumber } from '../../../../lib/db'
import { validateRecurring } from '../../../../lib/recurring'

const keJson = r => ({
  id: Number(r.id),
  jenis: r.jenis,
  description: r.description,
  item: r.item,
  category: r.category,
  amount: toNumber(r.amount),
  hari: Number(r.hari),
  walletId: r.wallet_id === null ? null : Number(r.wallet_id),
  aktif: r.aktif,
})

// Dompet boleh kosong. Nilai yang tidak masuk akal jadi null, bukan ditolak,
// supaya template tetap tersimpan meski dompetnya belum ditentukan.
const bersihkanWallet = v => {
  const n = parseInt(v, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const baris = await sql`
        select * from recurring
        order by jenis, hari, id
      `
      return res.json(baris.map(keJson))
    }

    if (req.method === 'POST') {
      const d = req.body || {}
      const galat = validateRecurring(d)
      if (galat.length) return res.status(400).json({ error: galat.join(', ') })

      const baris = await sql`
        insert into recurring (jenis, description, item, category, amount, hari, wallet_id, aktif)
        values (
          ${d.jenis},
          ${d.jenis === 'fixed' ? '' : String(d.description).trim()},
          ${d.jenis === 'fixed' ? d.item : null},
          ${d.jenis === 'variable' ? d.category : null},
          ${Math.round(Number(d.amount))},
          ${Number(d.hari)},
          ${bersihkanWallet(d.walletId)},
          ${d.aktif !== false}
        )
        returning *
      `
      return res.status(201).json(keJson(baris[0]))
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[recurring]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
