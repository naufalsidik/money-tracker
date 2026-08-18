import { withAuth } from '../../lib/auth'
import { sql, toNumber } from '../../lib/db'
import { getCurrentPeriod, isValidMonth, monthIndex } from '../../lib/periods'
import { FIXED_ITEMS } from '../../lib/validation'

// Di versi Google Sheets, endpoint ini menduplikat tab spreadsheet lengkap
// dengan formulanya. Di Postgres tidak ada yang perlu diduplikat: tanggal
// rekap dihitung on the fly, dan tabelnya sudah ada.
//
// Yang tersisa hanya satu kegunaan nyata: menyalin nilai fixed cost dari
// periode sebelumnya, karena kosan dan langganan biasanya jumlahnya sama
// tiap bulan.

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { newMonth, sourceMonth, year: yearRaw } = req.body || {}

  if (!isValidMonth(newMonth)) {
    return res.status(400).json({ error: 'Nama periode baru tidak valid' })
  }
  if (!isValidMonth(sourceMonth)) {
    return res.status(400).json({ error: 'Nama periode sumber tidak valid' })
  }

  const current = getCurrentPeriod()
  const sourceYear = parseInt(yearRaw, 10) || current.year

  // Kalau sumbernya Desember dan targetnya Januari, berarti pindah tahun.
  const newYear =
    monthIndex(sourceMonth) === 11 && monthIndex(newMonth) === 0
      ? sourceYear + 1
      : sourceYear

  try {
    const existing = await sql`
      SELECT 1 FROM fixed_costs
      WHERE month = ${newMonth} AND year = ${newYear}
      LIMIT 1
    `
    if (existing.length > 0) {
      return res.json({ success: true, message: 'Periode sudah ada' })
    }

    const sourceFixed = await sql`
      SELECT item, amount FROM fixed_costs
      WHERE month = ${sourceMonth} AND year = ${sourceYear}
    `
    const amountByItem = new Map(sourceFixed.map(r => [r.item, toNumber(r.amount)]))

    // Insert 5 baris fixed cost untuk periode baru, nilainya disalin dari
    // periode sumber. Item yang tidak ada di sumber diisi 0.
    const items = FIXED_ITEMS
    const amounts = FIXED_ITEMS.map(i => amountByItem.get(i) ?? 0)

    await sql`
      INSERT INTO fixed_costs (month, year, item, amount)
      SELECT ${newMonth}, ${newYear}, t.item, t.amount
      FROM unnest(${items}::text[], ${amounts}::bigint[]) AS t(item, amount)
      ON CONFLICT (month, year, item) DO NOTHING
    `

    res.json({
      success: true,
      message: `Periode "${newMonth} ${newYear}" berhasil dibuat`,
    })
  } catch (err) {
    console.error('[api/init-sheet]', err.message)
    res.status(500).json({ error: 'Gagal membuat periode baru' })
  }
}

export default withAuth(handler)
