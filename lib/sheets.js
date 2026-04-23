import { google } from 'googleapis'
import { MONTHS_ID } from './constants'

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

// Tentukan sheet berdasarkan tanggal saat ini
// Periode: 20 bulan ini - 19 bulan depan
// Contoh: sheet "April" = 20 Apr sampai 19 Mei
export function getCurrentSheetName() {
  const now = new Date()
  const day = now.getDate()
  if (day >= 20) {
    return MONTHS_ID[now.getMonth()]
  }
  const prevIdx = now.getMonth() - 1
  return MONTHS_ID[prevIdx < 0 ? 11 : prevIdx]
}

export function getPeriodLabel(sheetName) {
  const idx = MONTHS_ID.indexOf(sheetName)
  if (idx === -1) return sheetName
  const startMonth = MONTHS_ID[idx]
  const endMonth = MONTHS_ID[(idx + 1) % 12]
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
