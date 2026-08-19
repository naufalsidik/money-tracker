import { IkonDompet, IkonSurat } from '../components/icons'
import RingkasanMoney from '../modules/money/Ringkasan'
import RingkasanJobs from '../modules/jobs/Ringkasan'

// Daftar tunggal seluruh modul. Sidebar dan halaman home sama-sama
// membaca dari sini dan tidak tahu apa-apa soal isi tiap modul.
//
// Menambah modul baru: buat pages/<id>/, buat modules/<id>/Ringkasan.js,
// lalu tambahkan satu entri di bawah. Tidak ada berkas lain yang disentuh.
export const MODULES = [
  {
    id: 'money',
    href: '/money',
    label: 'Keuangan',
    deskripsi: 'Pemasukan, pengeluaran, dan sisa bulan ini',
    Icon: IkonDompet,
    Ringkasan: RingkasanMoney,
  },
  {
    id: 'jobs',
    href: '/jobs',
    label: 'Lamaran',
    deskripsi: 'Papan tunggu lamaran kerja',
    Icon: IkonSurat,
    Ringkasan: RingkasanJobs,
  },
]

export const cariModul = href =>
  MODULES.find(m => href === m.href || href.startsWith(m.href + '/'))
