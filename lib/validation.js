import { VAR_CATEGORIES, MONTHS_ID } from './constants'

// Whitelist item fixed cost — harus sama dengan yang ada di Google Sheet kolom G11-G15
export const FIXED_ITEMS = ['Kosan', 'Internet', 'iCloud', 'Claude', 'Apple Music']

// Validasi nama sheet untuk cegah injection ke Google Sheets API range
export function isValidSheetName(name) {
  if (typeof name !== 'string') return false
  return MONTHS_ID.includes(name)
}

// Validasi format tanggal: "DD/MM/YYYY" atau "D-Mon" (contoh "15-Apr")
export function isValidDate(str) {
  if (typeof str !== 'string') return false
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return true
  if (/^\d{1,2}-[A-Za-z]{3}$/.test(str)) return true
  return false
}

// Validasi jumlah uang: angka non-negatif dan wajar (max 1 miliar)
// Fixed cost boleh 0 (kalau user mau reset), yang lain minimal > 0
export function isValidAmount(val, allowZero = false) {
  const num = Number(val)
  if (!Number.isFinite(num)) return false
  if (allowZero ? num < 0 : num <= 0) return false
  if (num > 1_000_000_000) return false
  return true
}

// Validasi string deskripsi: tidak kosong, max 200 char
export function isValidDescription(str) {
  if (typeof str !== 'string') return false
  const trimmed = str.trim()
  return trimmed.length > 0 && trimmed.length <= 200
}

// Validasi untuk pengeluaran variable
export function validateVariable(data) {
  const errors = []
  if (!data || typeof data !== 'object') {
    return ['Data tidak valid']
  }
  if (!isValidDate(data.date)) errors.push('Format tanggal tidak valid')
  if (!isValidDescription(data.description)) errors.push('Deskripsi wajib diisi (max 200 karakter)')
  if (!VAR_CATEGORIES.includes(data.category)) errors.push('Kategori tidak valid')
  if (!isValidAmount(data.amount)) errors.push('Jumlah harus angka positif')
  return errors
}

// Validasi untuk pengeluaran fixed
export function validateFixed(data) {
  const errors = []
  if (!data || typeof data !== 'object') {
    return ['Data tidak valid']
  }
  if (!FIXED_ITEMS.includes(data.item)) errors.push('Item fixed cost tidak valid')
  // Fixed cost boleh di-set 0 (misal untuk reset)
  if (!isValidAmount(data.amount, true)) errors.push('Jumlah tidak valid')
  return errors
}

// Validasi untuk pemasukan
export function validateIncome(data) {
  const errors = []
  if (!data || typeof data !== 'object') {
    return ['Data tidak valid']
  }
  if (!isValidDate(data.date)) errors.push('Format tanggal tidak valid')
  if (!isValidDescription(data.description)) errors.push('Deskripsi wajib diisi (max 200 karakter)')
  if (!isValidAmount(data.amount)) errors.push('Jumlah harus angka positif')
  return errors
}

// Validasi untuk saving
export function validateSaving(data) {
  const errors = []
  if (!data || typeof data !== 'object') {
    return ['Data tidak valid']
  }
  if (!isValidDescription(data.component)) errors.push('Komponen wajib diisi')
  if (!isValidAmount(data.amount)) errors.push('Jumlah harus angka positif')
  return errors
}

// Validasi nomor row
export function isValidRowNum(n) {
  return Number.isInteger(n) && n >= 2 && n <= 200
}
