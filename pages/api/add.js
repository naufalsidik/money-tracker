import { withAuth } from '../../lib/auth'
import { getSheets, getCurrentSheetName, SPREADSHEET_ID } from '../../lib/sheets'
import { MONTH_ABBR } from '../../lib/constants'
import { isValidSheetName, validateVariable, validateIncome, validateSaving } from '../../lib/validation'

function formatDateForSheets(dateStr) {
  if (!dateStr) return ''
  if (/^\d{1,2}-[A-Za-z]{3}$/.test(dateStr)) return dateStr
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const day = parts[0]
    const monthIdx = parseInt(parts[1]) - 1
    return `${day}-${MONTH_ABBR[monthIdx] || parts[1]}`
  }
  return dateStr
}

async function findNextEmptyRow(sheets, sheetName, column, startRow, endRow) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!${column}${startRow}:${column}${endRow}`,
  })
  const rows = res.data.values || []
  let lastFilledIndex = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i][0] && String(rows[i][0]).trim() !== '') {
      lastFilledIndex = i
    }
  }
  const nextRow = startRow + lastFilledIndex + 1
  // Bounds check — cegah overflow ke row yang tidak di-format
  if (nextRow > endRow) {
    const err = new Error(`Section penuh. Maksimal ${endRow - startRow + 1} entri, silakan rapikan data lama di Google Sheet.`)
    err.statusCode = 400
    throw err
  }
  return nextRow
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, data, sheet } = req.body || {}

  // Validasi type
  if (!['variable', 'income', 'saving'].includes(type)) {
    return res.status(400).json({ error: 'Tipe transaksi tidak valid' })
  }

  // Validasi sheet name
  const sheetName = sheet || getCurrentSheetName()
  if (!isValidSheetName(sheetName)) {
    return res.status(400).json({ error: 'Nama sheet tidak valid' })
  }

  // Validasi data per tipe
  let validationErrors = []
  if (type === 'variable') validationErrors = validateVariable(data)
  else if (type === 'income') validationErrors = validateIncome(data)
  else if (type === 'saving') validationErrors = validateSaving(data)

  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors.join(', ') })
  }

  const sheets = getSheets()

  try {
    if (type === 'variable') {
      const { date, description, category, amount } = data
      const formattedDate = formatDateForSheets(date)
      const nextRow = await findNextEmptyRow(sheets, sheetName, 'B', 2, 60)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!B${nextRow}:E${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[formattedDate, description.trim(), category, Number(amount)]],
        },
      })
    } else if (type === 'income') {
      const { date, description, amount } = data
      const formattedDate = formatDateForSheets(date)
      const nextRow = await findNextEmptyRow(sheets, sheetName, 'G', 3, 10)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!G${nextRow}:I${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[formattedDate, description.trim(), Number(amount)]],
        },
      })
    } else if (type === 'saving') {
      const { component, amount } = data
      const nextRow = await findNextEmptyRow(sheets, sheetName, 'H', 26, 35)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!H${nextRow}:I${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[component.trim(), Number(amount)]],
        },
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[api/add]', err.message)
    const statusCode = err.statusCode || 500
    res.status(statusCode).json({ error: err.message || 'Gagal menyimpan data' })
  }
}

export default withAuth(handler)
