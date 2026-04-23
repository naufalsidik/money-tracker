import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
  if (req.method !== 'POST') return res.status(405).end()

  const { action, type, rowNum, sheetName, data } = req.body

  if (!rowNum || !sheetName) {
    return res.status(400).json({ error: 'rowNum dan sheetName wajib ada' })
  }

  const sheets = getSheets()

  try {
    if (action === 'delete') {
      // Get sheetId from sheet name
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
                startIndex: rowNum - 1, // 0-based
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
            values: [[formatDateForSheets(date), description, category, Number(amount)]]
          }
        })
      } else if (type === 'income') {
        const { date, description, amount } = data
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!G${rowNum}:I${rowNum}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[formatDateForSheets(date), description, Number(amount)]]
          }
        })
      }
      return res.json({ success: true })
    }

    res.status(400).json({ error: 'Action tidak dikenal' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
