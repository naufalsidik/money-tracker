import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sheets = getSheets()
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const names = meta.data.sheets.map(s => s.properties.title)
    res.json({ sheets: names })
  } catch (err) {
    console.error('[api/sheets-list]', err.message)
    res.status(500).json({ error: 'Gagal mengambil daftar sheet' })
  }
}

export default withAuth(handler)
