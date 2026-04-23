# Changelog

## v0.2.0 — Security & Code Quality Fixes

### Critical Security Fixes
- **Removed leaked `SPREADSHEET_ID`** from README, replaced with placeholder
- **Added `.gitignore`** to prevent accidentally committing `.env.local`, service account JSON, or IDE files
- **Added `.env.example`** sebagai template konfigurasi (tanpa secret asli)
- **Replaced `dangerouslySetInnerHTML`** di AI analysis output dengan `react-markdown` (mitigasi XSS dari potential prompt injection)
- **Migrated `safeCompare`** ke `crypto.timingSafeEqual` Node built-in, lebih tahan timing attack
- **Added origin check** di `withAuth` wrapper sebagai lapisan defense CSRF tambahan (selain SameSite cookie)

### API Hardening
- **Method validation** ditambah di `/api/data` dan `/api/sheets-list` (sebelumnya terima semua method)
- **Input validation terpusat** di `lib/validation.js`:
  - Nama sheet harus dari whitelist bulan Indonesia (cegah Google Sheets range injection)
  - Kategori harus dari whitelist `VAR_CATEGORIES`
  - Deskripsi max 200 karakter, tidak boleh kosong
  - Amount harus angka positif, max 1 miliar
  - Format tanggal divalidasi
  - rowNum divalidasi range
- **Error messages tidak leak internal details** — server log detail, client dapat pesan umum
- **Bounds check di `findNextEmptyRow`** — gagal dengan pesan jelas kalau section penuh (dulu diam-diam menulis ke row yang tidak di-format)
- **Rate limit di `/api/analyze`** — cooldown 30 detik per session, cegah spam yang bikin cost API membengkak
- **Model AI dipindah ke Haiku 4.5** — lebih cepat dan lebih murah untuk tugas summarization seperti ini

### Bug Fixes
- **Fix year hardcoded** di `init-sheet.js` — dulu selalu pakai 2026 untuk hitung hari Februari, sekarang pakai tahun dinamis (penting untuk tahun kabisat ke depan)
- **Validasi `SESSION_SECRET`** dengan warning di server log kalau tidak di-set atau kurang dari 32 karakter
- **Validasi `AUTH_USERNAME` & `AUTH_PIN`** — return error 500 yang informatif kalau belum di-set

### Code Quality
- **Dedup konstanta** — `MONTHS_ID`, `MONTH_ABBR`, `VAR_CATEGORIES`, `CATEGORY_COLORS` sekarang di satu tempat (`lib/constants.js`). Sebelumnya didefinisikan di 3+ file.
- **Security headers** di `next.config.js`: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Dashboard responsive** — grid cards pakai `auto-fit minmax` biar tidak pecah di layar kecil
- **Accessibility improvements**: `role="tab"` + `aria-selected` di navigation, `aria-hidden` di emoji icon, `role="alert"` di error message, `aria-label` di dropdown, `htmlFor` di input label
- **Maxlength** di input form (cegah input berlebihan di client-side juga)

### Dependencies
- **Added `react-markdown`** untuk render safe markdown
- **Added `eslint-config-next`** untuk linting

### Not Changed (Intentional)
Hal-hal berikut tidak saya ubah dalam refactor ini untuk menjaga stabilitas. Bisa dilakukan iterasi berikutnya:
- **Split `pages/index.js` jadi komponen terpisah** — file masih 600+ baris, tapi semua logic masih di satu tempat biar mudah diverifikasi setelah upgrade
- **Migrasi ke TypeScript** — butuh refactor besar
- **SWR atau React Query** untuk data fetching — pola fetch manual masih dipertahankan
- **Vercel KV untuk rate limiter** — masih pakai in-memory Map (cukup untuk personal use, terdokumentasi di README)
- **Multi-year sheet naming** — masih pakai `Januari`, `Februari`, dst (tanpa tahun). Breaking change kalau diubah sekarang.

## Migration Notes (dari versi lama)

1. Backup `.env` Vercel kamu dulu
2. Push repo baru (atau replace files)
3. Vercel akan auto-redeploy
4. Tidak ada perubahan skema di Google Sheets — struktur kolom sama persis
5. Test di preview deployment dulu sebelum merge ke main
6. Setelah deploy, test flow: login → lihat dashboard → tambah transaksi → edit → delete → analyze → logout
