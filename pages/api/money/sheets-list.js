import { withAuth } from '../../../lib/auth'
import { sql } from '../../../lib/db'
import { getCurrentPeriod, monthIndex, nextPeriod } from '../../../lib/periods'

// Bentuk respons dipertahankan (`{ sheets: [...] }`) supaya frontend
// tidak perlu diubah. Isinya daftar periode yang bisa dipilih.
//
// Periode berjalan dan periode berikutnya SELALU ikut, meski belum punya
// data sama sekali. Tanpa itu, tidak ada cara memilih periode kosong untuk
// mulai mengisinya — dropdown hanya menampilkan yang sudah berisi, dan
// yang belum berisi tidak akan pernah berisi karena tidak bisa dipilih.
//
// Ini yang menggantikan endpoint init-sheet. Baris fixed cost untuk periode
// baru dibuat sendiri oleh data.js saat periode itu pertama kali dibuka,
// dan nilainya diisi template Rutin.

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const current = getCurrentPeriod()
  const year = parseInt(req.query.year, 10) || current.year

  try {
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

    if (year === current.year) {
      names.add(current.month)

      // Periode berikutnya ikut ditawarkan supaya bisa diisi lebih awal.
      // Kalau berikutnya jatuh di tahun depan, dia tidak ditampilkan di
      // daftar tahun ini — itu benar, bukan kelalaian.
      const berikut = nextPeriod(current.month, current.year)
      if (berikut && berikut.year === year) names.add(berikut.month)
    }

    const sheets = [...names].sort((a, b) => monthIndex(a) - monthIndex(b))

    res.json({ sheets, year })
  } catch (err) {
    console.error('[api/sheets-list]', err.message)
    res.status(500).json({ error: 'Gagal mengambil daftar periode' })
  }
}

export default withAuth(handler)
