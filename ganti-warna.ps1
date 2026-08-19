# Ganti warna keras di pages\money\index.js menjadi token.
# Jalankan sekali dari akar proyek:  .\ganti-warna.ps1
#
# Aman diulang: kalau sudah pernah dijalankan, tidak ada yang cocok lagi.
# Cadangan otomatis dibuat sebelum menulis.

$p = (Resolve-Path "pages\money\index.js").Path
$cadangan = "$p.bak"
Copy-Item $p $cadangan -Force
Write-Host "Cadangan: $cadangan"

$t = [IO.File]::ReadAllText($p)

# Urutan penting: yang lebih spesifik dulu.
$peta = [ordered]@{
  # permukaan
  "'#0d1117'"          = "'var(--bg)'"
  "'#161b22'"          = "'var(--surface)'"
  "'1px solid #21262d'" = "'1px solid var(--border)'"
  "'2px solid #21262d'" = "'2px solid var(--border)'"
  "'#21262d'"          = "'var(--border)'"
  "'1px solid #30363d'" = "'1px solid var(--border-strong)'"
  "'#30363d'"          = "'var(--border-strong)'"

  # teks
  "'#e6edf3'"          = "'var(--ink)'"
  "'#8b949e'"          = "'var(--muted)'"
  "'#484f58'"          = "'var(--muted)'"

  # semantik
  "'#3fb950'"          = "'var(--money-in)'"
  "'#f85149'"          = "'var(--money-out)'"
  "'#58a6ff'"          = "'var(--money-plan)'"
  "'#bc8cff'"          = "'var(--st-Screening)'"

  # aksi
  "'2px solid #f0a500'" = "'2px solid var(--accent)'"
  "'1px solid #f0a500'" = "'1px solid var(--accent)'"
  "'#f0a500'"          = "'var(--accent)'"

  # atribut SVG Recharts (pakai tanda kutip ganda, bukan tunggal)
  '"#58a6ff"'          = '"var(--money-plan)"'
  '"#f0a500"'          = '"var(--accent)"'
  '"#3fb950"'          = '"var(--money-in)"'
  '"#f85149"'          = '"var(--money-out)"'
  '"#8b949e"'          = '"var(--muted)"'
  '"#21262d"'          = '"var(--border)"'
  '"#161b22"'          = '"var(--surface)"'
  '"#e6edf3"'          = '"var(--ink)"'
}

$total = 0
foreach ($k in $peta.Keys) {
  $n = ([regex]::Matches($t, [regex]::Escape($k))).Count
  if ($n -gt 0) {
    $t = $t.Replace($k, $peta[$k])
    Write-Host ("  {0,-24} -> {1,-28} {2}x" -f $k, $peta[$k], $n)
    $total += $n
  }
}

[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
Write-Host "`nTotal diganti: $total"
Write-Host "Sisa warna keras:"
Select-String -Path $p -Pattern '#[0-9a-fA-F]{6}'
