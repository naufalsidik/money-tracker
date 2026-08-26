# Spesifikasi Desain — Personal Tracker

Menggantikan seluruh versi sebelumnya. Dokumen ini menjelaskan sistem yang
benar-benar terpasang, bukan rencana. Kalau ada yang tidak cocok antara
dokumen ini dan kode, kodenya yang benar dan dokumen ini yang harus
diperbaiki.

Terakhir diperbarui setelah `redesign/navan` di-merge.

---

## 1. Asal-usul

Arah visual diambil dari Navan Admin dashboard: kanvas berwarna, kartu putih
nyaris rata, satu aksen, dan pola metrik dengan label kecil di atas angka
besar.

Yang **tidak** diambil dari Navan:
- Ungunya. Aksen tetap teal, karena teal sudah ada di logo dan ungu tidak
  berarti apa-apa untuk aplikasi ini.
- Abu dinginnya. Kanvas tetap krem hangat, ciri yang sudah ada sebelumnya.
- Kelapangan ekstremnya. Navan itu B2B dengan data mayoritas nol; data harian
  di sini padat.
- Ilustrasi di setiap keadaan kosong. Mahal dibuat, mahal dirawat.

---

## 2. Enam aturan yang tidak bisa ditawar

Kalau semua isi dokumen ini hilang kecuali satu bagian, biarkan bagian ini.

1. **Satu aksen.** Teal. Warna lain hanya boleh dipakai kalau punya arti
   semantik: positif, negatif, peringatan, status.
2. **Judul section tidak pernah berwarna.** Dulu "Pengeluaran Variable" merah,
   "Pengeluaran Tetap" ungu, "Pemasukan" teal. Ungunya bahkan meminjam
   `--st-Screening`, token status lamaran. Semuanya sekarang `--ink`.
3. **Nominal netral.** Angka biasa memakai `--ink`. Warna hanya untuk hal
   bersyarat: sisa yang minus, saldo yang minus, budget yang terlampaui,
   lamaran yang perlu ditindaklanjuti. Kalau setiap angka berwarna, warna
   berhenti berarti apa-apa.
4. **Label mundur, angka maju.** Label kecil `--muted`, angka besar tebal
   `--ink`. Bukan dua-duanya menonjol.
5. **Nol nilai visual hardcode di komponen.** Semua hex, ukuran huruf, dan
   jarak lewat token. Inline style menang atas apa pun, jadi sekali dipakai
   untuk warna, token kehilangan gunanya.
6. **Warna tidak pernah jadi satu-satunya penanda.** Selalu ada teks, tanda
   `+`/`-`, atau label pendampingnya.

---

## 3. Di mana segala sesuatunya berada

| Berkas | Isi |
|---|---|
| `styles/tokens.css` | Seluruh nilai warna, huruf, jarak, radius, gerak. Satu-satunya tempat hex boleh ditulis. |
| `styles/globals.css` | Di bagian bawah: kerangka halaman berlingkup `.hal` — tombol, modal, form, keadaan kosong, kabar galat. |
| `components/ui.js` | Primitif bersama: `Kartu`, `KepalaKartu`, `JudulSection`, `Metrik`, `Baris`, `Chip`, `Tombol`, `Pil`. |
| `components/money/` | `DasborMoney`, `DaftarTransaksi`, `TambahTransaksi`. |
| `components/Shell.js` | Sidebar, menu mobile, kerangka aplikasi. |
| `components/MoneyNav.js` | Tab bergaris bawah untuk modul Money. |

Menambah halaman baru: bungkus dengan `<div className="hal">` supaya mewarisi
kerangka global, lalu rakit dari `components/ui.js`. Jangan menulis ulang
kartu atau tombol.

---

## 4. Token

Nilai lengkapnya ada di `styles/tokens.css` dan tidak diulang di sini supaya
tidak ada dua sumber kebenaran. Yang perlu diketahui adalah maksud tiap
kelompok.

### Permukaan
`--bg` kanvas · `--surface` kartu · `--surface-2` blok cekung dan header tabel
· `--hover` latar interaksi.

`--surface-2` dan `--hover` **bukan hal yang sama**. Yang pertama menandai
permukaan yang lebih dalam, yang kedua menandai sesuatu sedang disorot.
Menukarnya membuat baris terlihat cekung permanen.

### Teks
`--ink` angka dan judul · `--ink-2` isi sekunder dan label form ·
`--muted` label kecil, caption, keterangan.

`--muted` di mode terang adalah `#6F6A60`. Nilai itu bukan pilihan estetika:
di `#8A857A` rasionya 3.67:1 di kartu putih dan 3.20:1 di kanvas, dua-duanya
gagal WCAG AA. Jangan diterangkan lagi tanpa mengukur ulang.

### Aksen
`--accent` teks dan garis · `--accent-quiet` isian dan ikon ·
`--accent-soft` isi chip aktif dan item nav aktif · `--accent-line` garisnya ·
`--solid` tombol utama, diarahkan ke `--accent` di kedua mode.

Dulu `--solid` navy di terang tapi teal di gelap, jadi tombol utama berganti
identitas antar mode.

### Semantik
`--ok` `--danger` `--warn` beserta pasangan `-soft`-nya untuk isi pil dan
kotak kabar.

### Uang
`--money-in` `--money-out` `--money-plan`.

**Ini yang paling sering disalahgunakan.** Ketiganya bukan untuk nominal
biasa. `--money-out` hanya untuk selisih negatif dan pelanggaran budget.
Daftar transaksi, kartu total pemasukan, kartu total pengeluaran, semuanya
memakai `--ink`.

### Status lamaran
`--st-Applied` `--st-Screening` `--st-Interview` `--st-Offer` `--st-Rejected`
`--st-Progress` `--st-Ghosted`.

Tujuh nama, empat warna. `Screening` menyatu ke `Applied`, `Ghosted` menyatu
ke `Progress`, karena keduanya tidak pernah dibedakan secara tindakan.
Namanya dipertahankan supaya tidak ada komponen yang putus. Kalau butuh
dibedakan lagi, pisahkan nilainya, jangan tambah nama.

### Suhu tunggu
`--w-calm` `--w-warm` `--w-hot` `--w-cold` `--w-mati`. Lima nama, empat
warna; `--w-hot` dan `--w-warm` bernilai sama.

### Chart
`--chart-1` sampai `--chart-5` adalah **tangga satu warna**, bukan palet
kategorikal. Breakdown pengeluaran itu satu seri, urut besaran, jadi
gradasinya sendiri yang menyampaikan urutan.

`--chart-actual` garis solid · `--chart-target` garis putus-putus abu ·
`--chart-over` hanya untuk segmen yang melewati budget.

---

## 5. Tipografi

Raleway untuk display, Source Sans 3 untuk isi. Tidak ada monospace;
`--font-mono` cuma alias supaya referensi lama tidak putus. Angka diluruskan
lewat `font-variant-numeric: tabular-nums` pada kelas `.num`.

Tangga: 12 / 13 / 14 / 16 / 20 / 26 / 34 px.

`--text-2xs` (12px) adalah warisan. Jangan dipakai untuk konten baru; label
memakai `--text-xs` (13px).

Judul halaman `h1` berat 800 dengan tracking −0.02em. Kerapatan itu ciri
paling kentara dari desain acuan; kalau dilonggarkan, kemiripannya hilang
lebih dulu daripada kalau warnanya diganti.

---

## 6. Pola komponen

### Blok metrik
```
[label 13px uppercase --muted]
[angka 34/26px bold --ink]
[catatan 13px --muted, opsional]
```
Label di atas. Selalu. Ini identitas visual utama.

### Kartu
`--surface` + border + `--radius-md` (14px) + `--pad-card` (24px, 16px di
mobile). `<Kartu rapat>` untuk kartu pembungkus daftar: padding nol, barisnya
yang mengatur sendiri.

### Judul section
Di kanvas, di luar kartu. 20px Raleway 700, `--ink`. Jarak antar section
`--gap-section` (40px).

### Baris daftar
`Baris` dari `ui.js` memakai grid, bukan flex, dengan lebar kolom tetap yang
diberikan pemanggil lewat prop `kolom`. Semua baris dalam satu daftar wajib
memakai lebar yang sama.

Kenapa grid: dengan flex, lebar tiap sel mengikuti isinya, jadi kolom
kategori di baris satu tidak pernah sejajar dengan baris dua.

Lebar yang dipakai lintas modul — jaga tetap sama supaya daftar di kartu
berbeda tetap sejajar:

| Kolom | Lebar |
|---|---|
| Tanggal | 104px |
| Dompet | 150px |
| Kategori | 132px |
| Persen | 92px |
| Jumlah | 176px |

Tinggi baris `--row-h` (56px). Aksi tersembunyi sampai baris disorot, tapi
tetap memesan tempat supaya kolom tidak bergeser. Di perangkat sentuh
(`hover: none`) aksi selalu tampak.

### Chip dan tombol
Chip filter: pil, `--accent-soft` + `--accent-line` saat aktif. Dipakai untuk
menyaring daftar yang sama.

Tab bergaris bawah dipakai untuk berpindah tampilan. Bentuknya sengaja
dibedakan dari chip karena fungsinya berbeda.

Tombol: `primer` (isi `--solid`), `sekunder` (pil beroutline aksen), `halus`,
`bahaya`. Tidak ada tombol bergaris merah permanen di dalam daftar.

### Keadaan kosong
Judul + satu baris penjelasan, di dalam kartu bergaris solid. Tanpa ilustrasi,
tanpa garis putus-putus.

---

## 7. Aturan data uang

1. Format `Rp1.250.000`. Tanpa desimal. Singkatan hanya boleh di sumbu chart.
2. Angka terpanjang yang harus muat: `Rp12.345.678.901`. Uji di 360px.
3. Kolom persen rata kanan, sejajar dengan kolom nominal.
4. Semua angka memakai kelas `.num`.

---

## 8. Aksesibilitas

- Kontras teks minimum 4.5:1. Ukur, jangan taksir — taksiran meleset 0.5 poin
  waktu menyetel `--muted`.
- `:focus-visible` 2px offset 2px, tidak pernah dihapus.
- Sasaran sentuh 44×44px. Tombol yang bentuknya lebih kecil menambah area
  tembus pandang lewat `::after`, bukan dengan membesarkan bentuknya.
- `prefers-reduced-motion` dihormati secara global.
- Jangan animasikan `width` atau `height`; pakai `transform` dan `opacity`.
- Tabel di mobile: geser mendatar di dalam kartunya, bukan meluber ke halaman.

---

## 9. Keputusan yang bisa dibalik

Dicatat supaya kalau nanti terasa salah, kamu tahu itu pilihan, bukan
kelalaian.

| Keputusan | Cara membalik |
|---|---|
| Total pemasukan dan pengeluaran netral | Tambah `nada="masuk"` / `nada="keluar"` di `Metrik` terkait |
| Rel warna status di tepi kiri baris Job Tracker dihapus | Kembalikan `border-left: 3px solid var(--rail)` di `.papan .row` |
| Aksen teal, bukan ungu Navan | Ganti empat variabel `--accent*` di `tokens.css` |
| Sidebar putih, bukan sewarna kanvas | `.sisi { background: var(--bg) }` di `Shell.js` |
| `--st-Screening` disamakan dengan `--st-Applied` | Kembalikan nilai ungunya di `tokens.css` |
| Tombol ciutkan sidebar keluar dari baris merek | Kembalikan ke dalam `.merek`, tapi lebarkan `--sidebar-w` |

---

## 10. Utang yang belum dibayar

- Daftar di mobile digeser mendatar. Layout kartu per baris akan lebih baik,
  tapi itu komponen tersendiri yang belum dibuat.
- Aksi baris di perangkat sentuh selalu terlihat. Idealnya menu atau geser.
- `.hal .btn` di kerangka global tidak punya perluasan sasaran sentuh seperti
  `Tombol` di `ui.js`. Tingginya 36px, di bawah 44px.
- `CATEGORY_COLORS` masih hex mentah di `lib/`, dipakai dengan menempelkan
  akhiran `'22'` sebagai alfa. Kalau dipindah ke token, cara itu berhenti
  bekerja.
- Semua hex hasil taksiran dari screenshot, belum pernah dicocokkan dengan
  color picker.

---

## 11. Checklist sebelum menganggap halaman selesai

- [ ] Nol hex atau px hardcode di komponen
- [ ] Terang dan gelap dua-duanya dicek
- [ ] Kontras teks diukur, bukan ditaksir
- [ ] `:focus-visible` terlihat di semua elemen interaktif
- [ ] Sasaran sentuh 44×44px
- [ ] `tabular-nums` di semua angka
- [ ] Judul section tidak berwarna semantik
- [ ] Nominal biasa netral
- [ ] Keadaan kosong, memuat, dan galat punya tampilan
- [ ] `Rp12.345.678.901` dan nama panjang tanpa spasi tidak merusak layout
- [ ] Ikon SVG garis, bukan emoji atau karakter seperti `❙❙`
- [ ] Diuji di 360 / 768 / 1024 / 1440
- [ ] `npm run build` lolos sebelum push
