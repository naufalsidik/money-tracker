# Cabut sisa emoji di pages\money\index.js
# Jalankan dari akar proyek:  powershell -ExecutionPolicy Bypass -File .\bersih-emoji.ps1
#
# Emoji tidak ditulis sebagai huruf di sini. PowerShell 5.1 membaca berkas
# .ps1 tanpa BOM sebagai ANSI, sehingga karakter di atas U+FFFF rusak
# sebelum sempat dibandingkan. Karena itu disusun dari pasangan surrogate.

$p = (Resolve-Path "pages\money\index.js").Path
Copy-Item $p "$p.bak5" -Force
Write-Host "Cadangan: $p.bak5"

$t = [IO.File]::ReadAllText($p)
$awal = $t.Length

$kotak = [string][char]0xD83D + [char]0xDCED   # U+1F4ED  kotak surat
$uang  = [string][char]0xD83D + [char]0xDCB0   # U+1F4B0  karung uang

$peta = @(
  @{ dari = "<p style={{ fontSize: 'var(--text-2xl)', marginBottom: 12 }}>$kotak</p>"; jadi = "" },
  @{ dari = "<p style={{ fontSize: 32, marginBottom: 12 }}>$kotak</p>";               jadi = "" },
  @{ dari = "label: '$uang Pemasukan'";                                               jadi = "label: 'Pemasukan'" }
)

foreach ($r in $peta) {
  $n = ([regex]::Matches($t, [regex]::Escape($r.dari))).Count
  if ($n -gt 0) {
    $t = $t.Replace($r.dari, $r.jadi)
    Write-Host ("  cocok {0}x" -f $n) -ForegroundColor Green
  } else {
    Write-Host ("  tidak cocok: {0}" -f $r.dari) -ForegroundColor Yellow
  }
}

[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
Write-Host ("`nSelisih panjang berkas: {0} karakter" -f ($awal - $t.Length))

# Surrogate tinggi menandai semua karakter di atas U+FFFF, termasuk emoji.
# Rentang kedua menangkap simbol lawas seperti bintang dan tanda centang.
Write-Host "`nSisa emoji (harus kosong):"
Select-String -Path $p -Pattern '[\uD800-\uDBFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]'
