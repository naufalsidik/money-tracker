import { withAuth } from '../../lib/auth'
import { getSheets, getCurrentSheetName, SPREADSHEET_ID } from '../../lib/sheets'
import { MONTH_ABBR } from '../../lib/constants'
import {
  isValidSheetName,
  validateVariable,
  validateIncome,
  validateSaving,
  validateFixed,
  FIXED_ITEMS,
} from '../../lib/validation'

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
  if (nextRow > endRow) {
    const err = new Error(`Section penuh. Maksimal ${endRow - startRow + 1} entri, silakan rapikan data lama di Google Sheet.`)
    err.statusCode = 400
    throw err
  }
  return nextRow
}

// Ambil jumlah fixed cost yang sudah terisi di row tertentu
// Dipakai untuk konfirmasi "replace" di client
async function getFixedAmount(sheets, sheetName, rowNum) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!H${rowNum}`,
  })
  const val = res.data.values?.[0]?.[0]
  if (!val) return 0
  return parseInt(String(val).replace(/[^0-9]/g, '')) || 0
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, data, sheet, confirm } = req.body || {}

  if (!['variable', 'fixed', 'income', 'saving'].includes(type)) {
    return res.status(400).json({ error: 'Tipe transaksi tidak valid' })
  }

  const sheetName = sheet || getCurrentSheetName()
  if (!isValidSheetName(sheetName)) {
    return res.status(400).json({ error: 'Nama sheet tidak valid' })
  }

  let validationErrors = []
  if (type === 'variable') validationErrors = validateVariable(data)
  else if (type === 'fixed') validationErrors = validateFixed(data)
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
    } else if (type === 'fixed') {
      // Fixed cost: write ke row yang sesuai dengan item
      const { item, amount } = data
      const itemIdx = FIXED_ITEMS.indexOf(item)
      if (itemIdx === -1) {
        return res.status(400).json({ error: 'Item tidak valid' })
      }
      const rowNum = 11 + itemIdx // G11 = Kosan, G12 = Internet, dst

      // Cek existing value untuk confirm flow
      const existing = await getFixedAmount(sheets, sheetName, rowNum)
      if (existing > 0 && !confirm) {
        return res.status(409).json({
          needsConfirm: true,
          existing,
          message: `Item ${item} sudah terisi Rp${existing.toLocaleString('id-ID')}`,
        })
      }

      // Write ke kolom H saja (kolom G preset, I formula)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!H${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[Number(amount)]],
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
      // Range baru: G37:H39 — dinamis, max 3 row
      const nextRow = await findNextEmptyRow(sheets, sheetName, 'G', 37, 39)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!G${nextRow}:H${nextRow}`,
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
