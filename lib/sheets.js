import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export function getSheets() {
  const auth = getAuth()
  return google.sheets({ version: 'v4', auth })
}

// Indonesian month names
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Determine which sheet to use based on current date
// Period: 20th of month to 19th of next month
// e.g., "April" sheet = Apr 20 to May 19
export function getCurrentSheetName() {
  const now = new Date()
  const day = now.getDate()
  if (day >= 20) {
    return MONTHS[now.getMonth()]
  } else {
    const prevIdx = now.getMonth() - 1
    return MONTHS[prevIdx < 0 ? 11 : prevIdx]
  }
}

export function getPeriodLabel(sheetName) {
  const idx = MONTHS.indexOf(sheetName)
  if (idx === -1) return sheetName
  const startMonth = MONTHS[idx]
  const endMonth = MONTHS[(idx + 1) % 12]
  const year = new Date().getFullYear()
  return `20 ${startMonth} - 19 ${endMonth} ${year}`
}

export function parseAmount(val) {
  if (!val) return 0
  if (typeof val === 'number') return val
  return parseInt(String(val).replace(/[^0-9]/g, '')) || 0
}

export function formatRupiah(num) {
  return 'Rp' + Number(num).toLocaleString('id-ID')
}

export { SPREADSHEET_ID }
