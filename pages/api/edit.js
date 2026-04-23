import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { MONTH_ABBR } from '../../lib/constants'
import { isValidSheetName, validateVariable, validateIncome, isValidRowNum } from '../../lib/validation'

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

  // Validasi action
  if (!['delete', 'update'].includes(action)) {
    return res.status(400).json({ error: 'Action tidak valid' })
  }

  // Validasi sheet & row
  if (!isValidSheetName(sheetName)) {
    return res.status(400).json({ error: 'Nama sheet tidak valid' })
  }
  if (!isValidRowNum(rowNum)) {
    return res.status(400).json({ error: 'Nomor row tidak valid' })
  }

  // Validasi type untuk update
  if (action === 'update') {
    if (!['variable', 'income'].includes(type)) {
      return res.status(400).json({ error: 'Tipe tidak valid untuk update' })
    }
    const errors = type === 'variable' ? validateVariable(data) : validateIncome(data)
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') })
    }
  }

  const sheets = getSheets()

  try {
    if (action === 'delete') {
      // Ambil sheetId dari metadata
      const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
      const sheet = meta.data.sheets.find(s => s.properties.title === sheetName)
      if (!sheet) return res.status(404).json({ error: 'Sheet tidak ditemukan' })

      const sheetId = sheet.properties.sheetId

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
      }
      return res.json({ success: true })
    }
  } catch (err) {
    console.error('[api/edit]', err.message)
    res.status(500).json({ error: 'Gagal memproses perubahan' })
  }
}

export default withAuth(handler)
