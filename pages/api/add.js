import { withAuth } from '../../lib/auth'
import { getSheets, getCurrentSheetName, SPREADSHEET_ID } from '../../lib/sheets'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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
  return startRow + lastFilledIndex + 1
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { type, data, sheet } = req.body
  const sheetName = sheet || getCurrentSheetName()
  const sheets = getSheets()

  try {
    if (type === 'variable') {
      const { date, description, category, amount } = data
      const formattedDate = formatDateForSheets(date)
      // Find next empty row in variable cost section (B2:B60)
      const nextRow = await findNextEmptyRow(sheets, sheetName, 'B', 2, 60)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!B${nextRow}:E${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[formattedDate, description, category, Number(amount)]],
        },
      })
    } else if (type === 'income') {
      const { date, description, amount } = data
      const formattedDate = formatDateForSheets(date)
      // Find next empty row in income section (G3:G10)
      const nextRow = await findNextEmptyRow(sheets, sheetName, 'G', 3, 6)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!G${nextRow}:I${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[formattedDate, description, Number(amount)]],
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
          values: [[component, Number(amount)]],
        },
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
