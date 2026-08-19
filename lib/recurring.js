import { sql } from './db'
import { monthIndex } from './periods'
import { FIXED_ITEMS } from './validation'
import { VAR_CATEGORIES } from './constants'

export const JENIS = ['income', 'variable', 'fixed']

const pad = n => String(n).padStart(2, '0')

// Kunci periode yang dipakai kolom recurring_for.
export const kunciPeriode = (month, year) => `${month}-${year}`

// Terjemahkan "tanggal 20" jadi tanggal sungguhan di dalam periode.
// Periode berjalan dari tanggal 20 bulan M sampai 19 bulan M+1, jadi
// hari >= 20 jatuh di bulan awal dan hari <= 19 di bulan berikutnya.
//
// Hari 31 di bulan yang hanya punya 30 hari dijepit ke hari terakhir,
// bukan dibuang. Kalau dibiarkan lewat, tagihan yang jatuh tempo akhir
// bulan akan hilang di bulan-bulan pendek.
export function tanggalDalamPeriode(hari, month, year) {
  const idx = monthIndex(month)
  if (idx === -1) return null

  if (hari >= 20) {
    const jumlahHari = new Date(Date.UTC(year, idx + 1, 0)).getUTCDate()
    return `${year}-${pad(idx + 1)}-${pad(Math.min(hari, jumlahHari))}`
  }

  const endIdx = (idx + 1) % 12
  const endYear = idx === 11 ? year + 1 : year
  const jumlahHari = new Date(Date.UTC(endYear, endIdx + 1, 0)).getUTCDate()
  return `${endYear}-${pad(endIdx + 1)}-${pad(Math.min(hari, jumlahHari))}`
}

export function validateRecurring(d) {
  const e = []
  if (!d || typeof d !== 'object') return ['Data tidak valid']
  if (!JENIS.includes(d.jenis)) e.push('Jenis tidak valid')

  const jumlah = Number(d.amount)
  if (!Number.isFinite(jumlah) || jumlah < 0 || jumlah > 1_000_000_000) {
    e.push('Jumlah tidak valid')
  }

  const hari = Number(d.hari)
  if (!Number.isInteger(hari) || hari < 1 || hari > 31) e.push('Hari harus 1-31')

  if (d.jenis === 'fixed') {
    if (!FIXED_ITEMS.includes(d.item)) e.push('Item fixed cost tidak valid')
  } else {
    const desc = String(d.description || '').trim()
    if (!desc || desc.length > 200) e.push('Deskripsi wajib diisi (max 200 karakter)')
    if (d.jenis === 'variable' && !VAR_CATEGORIES.includes(d.category)) {
      e.push('Kategori tidak valid')
    }
  }
  return e
}

// Masukkan semua template aktif ke periode ini.
//
// Dipanggil tiap kali /api/money/data dibaca. Aman diulang: indeks unik
// (recurring_id, recurring_for) menolak baris kedua untuk pasangan yang sama,
// dan ON CONFLICT DO NOTHING menelan penolakan itu tanpa melempar error.
//
// Fixed cost diperlakukan berbeda. Barisnya sudah dibuat lebih dulu oleh
// data.js dengan nilai 0, jadi yang dilakukan di sini bukan menyisipkan
// melainkan mengisi nilainya — dan hanya kalau masih 0. Syarat itu yang
// menjaga suntingan manual Anda tidak tertimpa setiap kali halaman dimuat.
export async function terapkanRecurring(month, year) {
  const templates = await sql`select * from recurring where aktif = true`
  if (!templates.length) return 0

  const kunci = kunciPeriode(month, year)
  let jumlah = 0

  for (const t of templates) {
    const tanggal = tanggalDalamPeriode(t.hari, month, year)
    if (!tanggal) continue

    if (t.jenis === 'income') {
      const r = await sql`
        insert into incomes (month, year, tanggal, description, amount, recurring_id, recurring_for)
        values (${month}, ${year}, ${tanggal}, ${t.description}, ${t.amount}, ${t.id}, ${kunci})
        on conflict do nothing
        returning id
      `
      jumlah += r.length
    } else if (t.jenis === 'variable') {
      const r = await sql`
        insert into variable_expenses (month, year, tanggal, description, category, amount, recurring_id, recurring_for)
        values (${month}, ${year}, ${tanggal}, ${t.description}, ${t.category}, ${t.amount}, ${t.id}, ${kunci})
        on conflict do nothing
        returning id
      `
      jumlah += r.length
    } else if (t.jenis === 'fixed') {
      const r = await sql`
        update fixed_costs set amount = ${t.amount}
        where month = ${month} and year = ${year} and item = ${t.item} and amount = 0
        returning id
      `
      jumlah += r.length
    }
  }

  return jumlah
}
