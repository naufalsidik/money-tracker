import { withAuth } from '../../lib/auth'
import { getSheets, getCurrentSheetName, getPeriodLabel, parseAmount, SPREADSHEET_ID } from '../../lib/sheets'
import { isValidSheetName, FIXED_ITEMS } from '../../lib/validation'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestedSheet = req.query.sheet
  const sheetName = requestedSheet || getCurrentSheetName()

  if (!isValidSheetName(sheetName)) {
    return res.status(400).json({ error: 'Nama sheet tidak valid' })
  }

  const sheets = getSheets()

  try {
    // Fetch semua range sekaligus dengan batchGet — lebih efisien
    const batchRes = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID,
      ranges: [
        `${sheetName}!B2:E`,     // variable cost
        `${sheetName}!G2:I`,     // income (akan di-parse, fixed cost di-skip karena start row 11)
        `${sheetName}!K2:P`,     // rekap
        `${sheetName}!G11:I15`,  // fixed cost (item, jumlah, persentase)
        `${sheetName}!G37:H39`,  // saving (komponen, jumlah)
      ],
    })

    const [varRes, incRes, rekapRes, fixedRes, savingRes] = batchRes.data.valueRanges

    // === Variable Cost ===
    const allVarRows = varRes.values || []
    const transactions = []
    allVarRows.forEach((r, i) => {
      const rowNum = i + 2
      const dateVal = String(r[0] || '')
      const isDate = /\d/.test(dateVal) && (dateVal.includes('-') || dateVal.includes('/'))
      if (r[0] && r[3] && isDate) {
        transactions.push({
          rowNum,
          date: r[0] || '',
          description: r[1] || '',
          category: r[2] || '',
          amount: parseAmount(r[3]),
        })
      }
    })

    // === Income ===
    // Ambil dari row 2 sampai sebelum row 11 (G2:I10 maksimal)
    // Karena kita fetch G2:I, data row fixed cost (G11-G15) juga ada di array,
    // tapi kita filter berdasarkan isDate biar gak kebawa ke income
    const allIncRows = incRes.values || []
    const income = []
    allIncRows.forEach((r, i) => {
      const rowNum = i + 2
      // Cuma parse sampai row 10 (batas income)
      if (rowNum > 10) return
      const dateVal = String(r[0] || '')
      const isDate = /\d/.test(dateVal) && (dateVal.includes('-') || dateVal.includes('/'))
      if (r[0] && r[2] && isDate) {
        income.push({
          rowNum,
          date: r[0] || '',
          description: r[1] || '',
          amount: parseAmount(r[2]),
        })
      }
    })

    // === Fixed Cost ===
    // G11:I15 — 5 item fixed. Kolom G = nama item (preset), H = jumlah, I = persentase
    const allFixedRows = fixedRes.values || []
    const fixedCost = []
    FIXED_ITEMS.forEach((expectedItem, idx) => {
      const rowNum = 11 + idx
      const row = allFixedRows[idx] || []
      // Baca dari sheet; kalau kolom G tidak match (user edit langsung), tetap pakai yang dari sheet
      const itemName = row[0] || expectedItem
      fixedCost.push({
        rowNum,
        item: itemName,
        amount: parseAmount(row[1]),
        percentage: row[2] || '0.00%',
      })
    })

    // === Rekap Harian ===
    const rekapRows = (rekapRes.values || []).filter(r => r[0] && r[1])
    const rekap = rekapRows.map(r => ({
      date: r[0] || '',
      jumlah: parseAmount(r[1]),
      wajar: parseAmount(r[2]),
      selisih: parseAmount(r[3]),
      sisa: parseAmount(r[4]),
      avgExpense: parseAmount(r[5]),
    }))

    // === Saving ===
    // G37:H39 — 3 slot. Dinamis, user bisa tambah, max 3.
    const allSavingRows = savingRes.values || []
    const saving = []
    allSavingRows.forEach((r, i) => {
      const rowNum = 37 + i
      if (r[0] && String(r[0]).trim() !== '') {
        saving.push({
          rowNum,
          component: r[0] || '',
          amount: parseAmount(r[1]),
        })
      }
    })

    // === Summary ===
    const totalIncome = income.reduce((s, i) => s + i.amount, 0)
    const totalVariable = transactions.reduce((s, t) => s + t.amount, 0)
    const totalFixed = fixedCost.reduce((s, f) => s + f.amount, 0)
    const categoryMap = {}
    transactions.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
    })

    res.json({
      sheetName,
      period: getPeriodLabel(sheetName),
      transactions,
      income,
      fixedCost,
      saving,
      rekap,
      summary: {
        totalIncome,
        totalVariable,
        totalFixed,
        totalExpense: totalVariable + totalFixed,
        categoryBreakdown: categoryMap,
      }
    })
  } catch (err) {
    console.error('[api/data]', err.message)
    res.status(500).json({ error: 'Gagal mengambil data sheet' })
  }
}

export default withAuth(handler)
