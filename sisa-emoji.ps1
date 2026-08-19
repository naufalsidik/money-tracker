# Bersihkan sisa emoji dan samakan judul kartu di pages\money\index.js
# Jalankan dari akar proyek:  .\sisa-emoji.ps1

$p = (Resolve-Path "pages\money\index.js").Path
Copy-Item $p "$p.bak4" -Force
Write-Host "Cadangan: $p.bak4"
$t = [IO.File]::ReadAllText($p)

$peta = [ordered]@{
  # Emoji kotak kosong pada state "tidak ada data"
  "<p style={{ fontSize: 'var(--text-2xl)', marginBottom: 12 }}>&#128236;</p>" = ""
  '<p style={{ fontSize: ''var(--text-2xl)'', marginBottom: 12 }}>📭</p>' = ""

  # Emoji di pemilih jenis transaksi
  "label: '&#128176; Pemasukan'" = "label: 'Pemasukan'"
  "label: '💰 Pemasukan'"        = "label: 'Pemasukan'"

  # Judul kartu dan panel: samakan dengan label kecil di Job Tracker
  "letterSpacing: '0.05em'" = "letterSpacing: 'var(--tracking-label)'"
}

$total = 0
foreach ($k in $peta.Keys) {
  $n = ([regex]::Matches($t, [regex]::Escape($k))).Count
  if ($n -gt 0) { $t = $t.Replace($k, $peta[$k]); Write-Host ("  {0,-52} {1}x" -f $k.Substring(0,[Math]::Min(50,$k.Length)), $n); $total += $n }
}

[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
Write-Host "`nTotal diganti: $total"
Write-Host "`nSisa emoji (harus kosong):"
Select-String -Path $p -Pattern '[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]'
