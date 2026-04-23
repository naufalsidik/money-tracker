import { withAuth } from '../../lib/auth'
import { getSheets, getCurrentSheetName, getPeriodLabel, parseAmount, SPREADSHEET_ID } from '../../lib/sheets'
import { isValidSheetName } from '../../lib/validation'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestedSheet = req.query.sheet
  const sheetName = requestedSheet || getCurrentSheetName()

  // Validasi nama sheet — harus dari whitelist nama bulan Indonesia
  if (!isValidSheetName(sheetName)) {
    return res.status(400).json({ error: 'Nama sheet tidak valid' })
  }

  const sheets = getSheets()

  try {
    const varRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!B2:E`,
    })
    const incRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!G2:I`,
    })
    const rekapRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!K2:P`,
    })

    const allVarRows = varRes.data.values || []
    const transactions = []
    allVarRows.forEach((r, i) => {
      const rowNum = i + 2 // B2 = row 2
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

    const allIncRows = incRes.data.values || []
    const income = []
    allIncRows.forEach((r, i) => {
      const rowNum = i + 2
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

    const rekapRows = (rekapRes.data.values || []).filter(r => r[0] && r[1])
    const rekap = rekapRows.map(r => ({
      date: r[0] || '',
      jumlah: parseAmount(r[1]),
      wajar: parseAmount(r[2]),
      selisih: parseAmount(r[3]),
      sisa: parseAmount(r[4]),
      avgExpense: parseAmount(r[5]),
    }))

    const totalIncome = income.reduce((s, i) => s + i.amount, 0)
    const totalVariable = transactions.reduce((s, t) => s + t.amount, 0)
    const categoryMap = {}
    transactions.forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
    })

    res.json({
      sheetName,
      period: getPeriodLabel(sheetName),
      transactions,
      income,
      rekap,
      summary: { totalIncome, totalVariable, categoryBreakdown: categoryMap }
    })
  } catch (err) {
    console.error('[api/data]', err.message)
    // Jangan leak detail error ke client
    res.status(500).json({ error: 'Gagal mengambil data sheet' })
  }
}

export default withAuth(handler)
