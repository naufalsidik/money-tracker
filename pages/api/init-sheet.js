import { withAuth } from '../../lib/auth'
import { getSheets, SPREADSHEET_ID } from '../../lib/sheets'
import { MONTHS_ID, MONTH_ABBR } from '../../lib/constants'
import { isValidSheetName } from '../../lib/validation'

// Generate tanggal rekap: 20 bulan awal sampai 19 bulan berikutnya
// Pakai tahun dinamis (bukan hardcoded) biar tetep jalan di tahun kabisat ke depan
function generateRekapDates(monthName) {
  const idx = MONTHS_ID.indexOf(monthName)
  if (idx === -1) return []

  const year = new Date().getFullYear()
  const nextIdx = (idx + 1) % 12
  // Kalau start bulan adalah Desember, bulan berikutnya di tahun depan
  const nextYear = idx === 11 ? year + 1 : year

  const dates = []
  // Tanggal 20 sampai akhir bulan awal
  const daysInStartMonth = new Date(year, idx + 1, 0).getDate()
  for (let d = 20; d <= daysInStartMonth; d++) {
    dates.push(`${d}-${MONTH_ABBR[idx]}`)
  }
  // Tanggal 1 sampai 19 bulan berikutnya
  // Note: nextYear dipakai implisit via new Date(nextYear, nextIdx+1, 0) seandainya
  // mau cek hari di bulan next, tapi karena kita cuma iterasi 1-19, tidak perlu
  for (let d = 1; d <= 19; d++) {
    dates.push(`${d}-${MONTH_ABBR[nextIdx]}`)
  }
  return dates
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { newMonth, sourceMonth } = req.body || {}

  if (!isValidSheetName(newMonth)) {
    return res.status(400).json({ error: 'Nama bulan baru tidak valid' })
  }
  if (!isValidSheetName(sourceMonth)) {
    return res.status(400).json({ error: 'Nama bulan source tidak valid' })
  }

  const sheets = getSheets()

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    const allSheets = meta.data.sheets
    const existingNames = allSheets.map(s => s.properties.title)

    if (existingNames.includes(newMonth)) {
      return res.json({ success: true, message: 'Sheet sudah ada' })
    }

    const sourceSheet = allSheets.find(s => s.properties.title === sourceMonth)
    if (!sourceSheet) {
      return res.status(400).json({ error: `Sheet "${sourceMonth}" tidak ditemukan` })
    }

    const sourceSheetId = sourceSheet.properties.sheetId

    // Duplicate sheet source
    await sheets.spreadsheets.batchUpdate({
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

    // Clear data pengeluaran variable (B2:E60) — header di row 1 dipertahankan
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!B2:E60`,
    })

    // Clear data pemasukan (G3:I10) — baris formula JUMLAH dipertahankan
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!G3:I10`,
    })

    // Update tanggal rekap di kolom K
    const rekapDates = generateRekapDates(newMonth)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!K2:K${1 + rekapDates.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rekapDates.map(d => [d]),
      },
    })

    // Clear kolom rekap jumlah (L2:L32) — formula akan repopulate
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${newMonth}!L2:L32`,
    })

    res.json({ success: true, message: `Sheet "${newMonth}" berhasil dibuat` })
  } catch (err) {
    console.error('[api/init-sheet]', err.message)
    res.status(500).json({ error: 'Gagal membuat sheet baru' })
  }
}

export default withAuth(handler)
