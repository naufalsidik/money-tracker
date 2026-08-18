import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL belum di-set. Cek .env.local atau Environment Variables di Vercel.')
}

// sql adalah tagged template. Nilai yang ditaruh di dalam ${} otomatis
// dikirim sebagai parameter terpisah, bukan digabung ke string SQL.
// Artinya SQL injection tidak mungkin selama kamu selalu pakai bentuk ini:
//
//   await sql`SELECT * FROM incomes WHERE month = ${month}`   <- aman
//
// Jangan pernah bikin query dengan penggabungan string biasa:
//
//   await sql('SELECT * FROM incomes WHERE month = ' + month) <- berbahaya
export const sql = neon(process.env.DATABASE_URL)

// Postgres mengembalikan BIGINT sebagai string (karena bisa lebih besar
// dari Number.MAX_SAFE_INTEGER). Semua amount harus dilewatkan ke sini
// sebelum dikirim ke frontend, kalau tidak "1500000" akan diperlakukan
// sebagai teks dan penjumlahan jadi salah.
export function toNumber(val) {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}
