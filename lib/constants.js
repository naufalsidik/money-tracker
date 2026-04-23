// Nama bulan Indonesia lengkap (untuk nama sheet)
export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Singkatan bulan Inggris (untuk format tanggal di sheet, misal "15-Apr")
export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// Whitelist kategori untuk pengeluaran variable
// Dipakai untuk validasi di API dan dropdown di UI
export const VAR_CATEGORIES = [
  'Belanja', 'Donasi', 'Hiburan', 'Hutang', 'Jajan', 'Kebutuhan',
  'Kesehatan', 'Lain-lain', 'Laundry', 'Makan', 'Parkir',
  'Pendidikan', 'Perawatan Diri', 'Transportasi'
]

// Warna per kategori untuk UI
export const CATEGORY_COLORS = {
  Hutang: '#f85149', Makan: '#3fb950', Jajan: '#f0a500',
  Transportasi: '#58a6ff', Belanja: '#bc8cff', Donasi: '#39d353',
  Parkir: '#ffa657', Laundry: '#79c0ff', Pendidikan: '#d2a8ff',
  Kebutuhan: '#56d364', Kesehatan: '#ff7b72', Hiburan: '#e3b341',
  'Perawatan Diri': '#f778ba', 'Lain-lain': '#8b949e',
}
