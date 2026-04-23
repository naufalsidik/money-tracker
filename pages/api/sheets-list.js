import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function handler(req, res) {
  const sheets = getSheets()
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const names = meta.data.sheets.map(s => s.properties.title)
    res.json({ sheets: names })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
