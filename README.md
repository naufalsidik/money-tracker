# Money Tracker

Web app untuk catatan keuangan personal yang terhubung ke Google Sheets, dengan analisis AI menggunakan Claude.

## Setup & Deploy

### 1. Upload ke GitHub
- Buat repo baru di github.com (**private**)
- Upload semua file ini ke repo tersebut

### 2. Setup Google Sheets
- Buat Google Sheet baru dengan struktur yang dijelaskan di bagian bawah
- Buat service account di [Google Cloud Console](https://console.cloud.google.com):
  - Enable "Google Sheets API"
  - IAM & Admin → Service Accounts → Create
  - Download JSON key file
- Share Google Sheet ke email service account (`xxx@xxx.iam.gserviceaccount.com`) dengan role **Editor**
- Catat Spreadsheet ID (ada di URL: `docs.google.com/spreadsheets/d/<ID>/edit`)

### 3. Deploy ke Vercel
- Buka vercel.com, login dengan GitHub
- Klik "Add New Project", pilih repo money-tracker
- Sebelum deploy, tambahkan Environment Variables:

| Variable | Value | Cara dapat |
|---|---|---|
| `SPREADSHEET_ID` | ID Google Sheet kamu | Dari URL sheet |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Seluruh isi JSON service account (copy-paste) | File JSON yang didownload |
| `ANTHROPIC_API_KEY` | API key dari console.anthropic.com | Daftar di [console.anthropic.com](https://console.anthropic.com) |
| `SESSION_SECRET` | Random string min 32 karakter | Generate dengan `openssl rand -hex 32` |
| `AUTH_USERNAME` | Username login kamu | Bebas |
| `AUTH_PIN` | PIN numerik untuk login | Bebas |

- Klik Deploy

### 4. Test deployment
- Buka URL Vercel
- Login dengan `AUTH_USERNAME` dan `AUTH_PIN` yang kamu set
- Kalau sheet Januari (atau bulan current) kosong, akan muncul pesan "Tidak ada data ditemukan"

## Struktur Sheet yang Diperlukan

Setiap sheet merepresentasikan satu periode (dari tanggal 20 suatu bulan sampai 19 bulan berikutnya).

**Nama sheet:** nama bulan dalam bahasa Indonesia (`Januari`, `Februari`, `Maret`, dst)

**Kolom yang digunakan:**

| Kolom | Data | Keterangan |
|---|---|---|
| B-E (row 2-60) | Tanggal, Deskripsi, Kategori, Jumlah | Pengeluaran variable |
| G-I (row 3-10) | Tanggal, Deskripsi, Jumlah | Pemasukan |
| K-P (row 2-32) | Tanggal, Jumlah, Wajar, Selisih, Sisa, Avg Expense | Rekap harian (formula) |
| H-I (row 26-35) | Komponen, Jumlah | Saving/tabungan (optional) |

Sheet baru bisa dibuat lewat tombol "Buat Sheet" di aplikasi, yang akan meng-duplicate sheet sebelumnya.

## Security Notes

- Rate limiter login: 5 percobaan per 15 menit, lockout 30 menit
- Session cookie: HttpOnly, SameSite=strict, Secure (di production)
- Password compared menggunakan constant-time comparison
- Rate limiter menggunakan in-memory store; di Vercel serverless ini bisa reset saat cold start. Untuk use case personal sudah cukup, tapi untuk keamanan lebih ketat pertimbangkan migrasi ke Vercel KV.
- **Jangan commit file service account JSON ke git.** File `.gitignore` sudah memblokir pattern umum.

## Local Development

```bash
# Install dependencies
npm install

# Buat file .env.local dengan variabel di atas
cp .env.example .env.local

# Run development server
npm run dev
```

## Tech Stack

- Next.js 14 (Pages Router)
- React 18
- Tailwind CSS
- iron-session (session management)
- googleapis (Google Sheets integration)
- @anthropic-ai/sdk (AI analysis)
- recharts (visualization)
- react-markdown (safe markdown rendering)
