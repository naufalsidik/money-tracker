import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { MONTH_ABBR } from '../../lib/constants'
import {
  isValidSheetName,
  validateVariable,
  validateIncome,
  validateSaving,
  validateFixed,
  isValidRowNum,
  isValidAmount,
} from '../../lib/validation'

function formatDateForSheets(dateStr) {
  if (!dateStr) return ''
  if (/^\d{1,2}-[A-Za-z]{3}$/.test(dateStr)) return dateStr
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    return `${parts[0]}-${MONTH_ABBR[parseInt(parts[1]) - 1] || parts[1]}`
  }
  return dateStr
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, type, rowNum, sheetName, data } = req.body || {}

  if (!['delete', 'update'].includes(action)) {
    return res.status(400).json({ error: 'Action tidak valid' })
  }

  if (!isValidSheetName(sheetName)) {
    return res.status(400).json({ error: 'Nama sheet tidak valid' })
  }
  if (!isValidRowNum(rowNum)) {
    return res.status(400).json({ error: 'Nomor row tidak valid' })
  }

  // Fixed cost tidak boleh di-delete (nanti formula rusak)
  if (action === 'delete' && type === 'fixed') {
    return res.status(400).json({ error: 'Fixed cost tidak bisa dihapus. Set jumlah 0 untuk reset.' })
  }

  // Validasi type untuk update
  if (action === 'update') {
    const validTypes = ['variable', 'income', 'saving', 'fixed']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Tipe tidak valid untuk update' })
    }
    let errors = []
    if (type === 'variable') errors = validateVariable(data)
    else if (type === 'income') errors = validateIncome(data)
    else if (type === 'saving') errors = validateSaving(data)
    else if (type === 'fixed') {
      // Fixed cuma update jumlah — cek amount saja
      if (!isValidAmount(data?.amount, true)) errors = ['Jumlah tidak valid']
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') })
    }
  }

  const sheets = getSheets()

  try {
    if (action === 'delete') {
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
      const sheet = meta.data.sheets.find(s => s.properties.title === sheetName)
      if (!sheet) return res.status(404).json({ error: 'Sheet tidak ditemukan' })

      const sheetId = sheet.properties.sheetId

      // Saving pakai clear, bukan delete row (karena row 37-39 adalah slot tetap di sheet)
      if (type === 'saving') {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!G${rowNum}:H${rowNum}`,
        })
        return res.json({ success: true })
      }

      // Variable & income: hapus row fisik
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNum - 1,
                endIndex: rowNum,
              }
            }
          }]
        }
      })

      return res.json({ success: true })
    }

    if (action === 'update') {
      if (type === 'variable') {
        const { date, description, category, amount } = data
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!B${rowNum}:E${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[formatDateForSheets(date), description.trim(), category, Number(amount)]]
          }
        })
      } else if (type === 'income') {
        const { date, description, amount } = data
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!G${rowNum}:I${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[formatDateForSheets(date), description.trim(), Number(amount)]]
          }
        })
      } else if (type === 'saving') {
        const { component, amount } = data
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!G${rowNum}:H${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[component.trim(), Number(amount)]]
          }
        })
      } else if (type === 'fixed') {
        const { amount } = data
        // Fixed cost: cuma update kolom H (jumlah), kolom G preset, I formula
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!H${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[Number(amount)]]
          }
        })
      }
      return res.json({ success: true })
    }
  } catch (err) {
    console.error('[api/edit]', err.message)
    res.status(500).json({ error: 'Gagal memproses perubahan' })
  }
}

export default withAuth(handler)
