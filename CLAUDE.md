# Personal Tracker

Dasbor keuangan dan lamaran kerja pribadi. Proyek satu orang, dipakai sendiri
setiap hari.

## Stack

- Next.js 16, **Pages Router**. Bukan App Router.
- React 19, Recharts 3
- Neon Postgres serverless, region `ap-southeast-1`
- iron-session untuk autentikasi
- Styling: CSS custom properties + styled-jsx. **Tanpa Tailwind. Tanpa TypeScript.**
- Deploy: Vercel, push manual dari main

## Lingkungan

Windows, PowerShell. Perintah Unix tidak tersedia — pakai `Select-String`
untuk `grep`, `Get-ChildItem` untuk `find`.

## Aturan kerja

- **Tulis file utuh, bukan potongan.** Tempel sebagian adalah sumber bug
  paling sering di proyek ini.
- **`npm run build` sebelum push.** `npm run dev` lebih longgar dan
  meloloskan hal yang menggagalkan deploy Vercel.
- Kerjaan UI tidak menyentuh logika, query, atau bentuk data. Kalau perlu,
  tanya dulu.
- Jangan pernah menimpa isi folder `data/`.
- Jawaban ringkas. Penilaian dilakukan dari hasil, bukan dari penjelasan.

## Aturan domain yang tidak boleh dilanggar

- **Saldo dompet selalu dihitung dari transaksi** lewat view `wallet_balances`,
  tidak pernah disimpan sebagai kolom. Menyimpannya berarti cepat atau lambat
  angkanya menyimpang.
- **Nominal disimpan sebagai BIGINT dalam rupiah penuh.** Tanpa desimal,
  tanpa float.
- **Periode berjalan tanggal 20 sampai 19**, mengikuti tanggal gajian.
- **Transaksi rutin memakai tabel `recurring_applied`** supaya baris yang
  sudah dihapus manual tidak dibuat ulang.
- Data turunan dibuat sebagai **Postgres view**, bukan dihitung di aplikasi:
  saldo dompet, status budget, progres target, net worth.

## Desain

Seluruh aturan visual ada di **`docs/design-spec.md`**. Baca dulu sebelum
menyentuh apa pun yang tampil di layar.

Ringkasnya:

- Nilai visual hanya boleh ditulis di `styles/tokens.css`. Komponen memakai
  `var(--...)`, tidak pernah hex mentah, tidak pernah px mentah.
- Primitif bersama ada di `components/ui.js`: `Kartu`, `JudulSection`,
  `Metrik`, `Baris`, `Chip`, `Tombol`, `Pil`. Jangan menulis ulang kartu atau
  tombol per halaman.
- Kerangka halaman (tombol, modal, form, keadaan kosong) ada di bagian bawah
  `styles/globals.css`, berlingkup `.hal`. Halaman baru cukup dibungkus
  `<div className="hal">`.
- Satu aksen: teal. Judul section tidak pernah berwarna. Nominal biasa netral;
  warna hanya untuk hal bersyarat.

## Jebakan yang sudah pernah menggigit

- styled-jsx tidak menempelkan kelas scoping ke komponen seperti `Link`,
  hanya ke elemen DOM asli. Penataannya lewat `:global(...)`.
- Inline style menang atas token. Sekali dipakai untuk warna, sistem token
  kehilangan gunanya.
- Angka rupiah bergoyang saat nilainya berubah kalau `tabular-nums` lupa
  dipasang. Pakai kelas `.num`.
- Kontras warna harus diukur dengan alat, bukan ditaksir dari layar.

## Struktur

```
components/
  ui.js                 primitif bersama
  Shell.js              sidebar dan kerangka aplikasi
  MoneyNav.js           tab modul Money
  KartuRingkasan.js     kartu modul di home
  money/                DasborMoney, DaftarTransaksi, TambahTransaksi
lib/
  modules.js            daftar modul, dibaca sidebar dan home
  constants.js, validation.js, auth.js
modules/
  money/Ringkasan.js    ringkasan modul untuk home
  jobs/Ringkasan.js
pages/
  index.js              home
  money/                index (dashboard, tambah, transaksi), rutin,
                        target, dompet, transfer
  jobs/index.js
styles/
  tokens.css            satu-satunya sumber nilai visual
  globals.css           dasar + kerangka .hal
docs/
  design-spec.md        aturan desain lengkap
```
