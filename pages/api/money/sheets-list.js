import { withAuth } from '../../../lib/auth'
import { sql } from '../../../lib/db'
import { getCurrentPeriod, monthIndex } from '../../../lib/periods'

// Nama file dan bentuk responsnya dipertahankan (`{ sheets: [...] }`)
// supaya pages/index.js tidak perlu diubah. Isinya sekarang daftar periode
// yang punya data di database, bukan daftar tab spreadsheet.

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const current = getCurrentPeriod()
  const year = parseInt(req.query.year, 10) || current.year

  try {
    // UNION menggabungkan hasil keempat tabel dan otomatis membuang duplikat.
    const rows = await sql`
      SELECT month FROM variable_expenses WHERE year = ${year}
      UNION
      SELECT month FROM incomes           WHERE year = ${year}
      UNION
      SELECT month FROM fixed_costs       WHERE year = ${year}
      UNION
      SELECT month FROM savings           WHERE year = ${year}
    `

    const names = new Set(rows.map(r => r.month))
    // Periode berjalan selalu ikut ditampilkan walaupun masih kosong,
    // supaya bisa langsung dipilih dan diisi.
    if (year === current.year) names.add(current.month)

    // Urutkan menurut urutan bulan, bukan alfabet.
    const sheets = [...names].sort((a, b) => monthIndex(a) - monthIndex(b))

    res.json({ sheets, year })
  } catch (err) {
    console.error('[api/sheets-list]', err.message)
    res.status(500).json({ error: 'Gagal mengambil daftar periode' })
  }
}

export default withAuth(handler)
