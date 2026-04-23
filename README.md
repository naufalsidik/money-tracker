# Money Tracker

Web app untuk catatan keuangan yang connect ke Google Sheets.

## Setup & Deploy

### 1. Upload ke GitHub
- Buat repo baru di github.com (private)
- Upload semua file ini ke repo tersebut

### 2. Deploy ke Vercel
- Buka vercel.com, login dengan GitHub
- Klik "Add New Project"
- Pilih repo money-tracker
- Sebelum deploy, tambahkan Environment Variables:

| Variable | Value |
|---|---|
| `SPREADSHEET_ID` | ID Google Sheet kamu (lihat URL sheet) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Seluruh isi file JSON service account (copy paste) |
| `ANTHROPIC_API_KEY` | API key dari console.anthropic.com |

- Klik Deploy

### 3. Anthropic API Key (untuk fitur AI Analysis)
- Daftar di console.anthropic.com
- Buat API key baru
- Paste ke environment variable `ANTHROPIC_API_KEY`
- Anthropic memberi free credits untuk pendaftar baru

## Struktur Sheet yang Diperlukan
- Nama sheet: nama bulan dalam bahasa Indonesia (Januari, Februari, dst)
- Kolom B-E: Tanggal, Deskripsi, Kategori, Jumlah (variable cost)
- Kolom G-I: Tanggal, Deskripsi, Jumlah (income)
- Kolom K-P: Tanggal, Jumlah, Wajar, Selisih, Sisa, Avg Expense (rekap)
