import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Generate rekap dates: 20th of startMonth to 19th of next month
function generateRekapDates(monthName) {
  const idx = MONTHS_ID.indexOf(monthName)
  if (idx === -1) return []
  const nextIdx = (idx + 1) % 12
  const dates = []
  // Days 20-end of start month
  const daysInStartMonth = new Date(2026, idx + 1, 0).getDate()
  for (let d = 20; d <= daysInStartMonth; d++) {
    dates.push(`${d}-${MONTH_ABBR[idx]}`)
  }
  // Days 1-19 of next month
  for (let d = 1; d <= 19; d++) {
    dates.push(`${d}-${MONTH_ABBR[nextIdx]}`)
  }
  return dates
}

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { newMonth, sourceMonth } = req.body
  const sheets = getSheets()

  try {
    // Get all existing sheets
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const allSheets = meta.data.sheets
    const existingNames = allSheets.map(s => s.properties.title)

    if (existingNames.includes(newMonth)) {
      return res.json({ success: true, message: 'Sheet sudah ada' })
    }

    // Find source sheet to duplicate
    const sourceSheet = allSheets.find(s => s.properties.title === sourceMonth)
    if (!sourceSheet) {
      return res.status(400).json({ error: `Sheet "${sourceMonth}" tidak ditemukan` })
    }

    const sourceSheetId = sourceSheet.properties.sheetId

    // Duplicate the source sheet
    const dupRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          duplicateSheet: {
            sourceSheetId,
            insertSheetIndex: allSheets.length,
            newSheetName: newMonth,
          }
        }]
      }
    })

    // Clear variable cost data (B2:E60) - keep row 1 header
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!B2:E60`,
    })

    // Clear income data rows (G3:I10) - keep JUMLAH formula row
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!G3:I10`,
    })

    // Update rekap dates in column K (K2:K32)
    const rekapDates = generateRekapDates(newMonth)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!K2:K${1 + rekapDates.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rekapDates.map(d => [d]),
      },
    })

    // Clear rekap jumlah column (L2:L32) - formulas will repopulate
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!L2:L32`,
    })

    res.json({ success: true, message: `Sheet "${newMonth}" berhasil dibuat` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
