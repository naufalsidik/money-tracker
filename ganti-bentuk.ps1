# Tahap kedua: samakan bentuk, ukuran huruf, jarak, dan font
# di pages\money\index.js dengan token bersama.
#
# Jalankan sekali dari akar proyek:  .\ganti-bentuk.ps1
# Cadangan dibuat otomatis. Aman diulang.

$p = (Resolve-Path "pages\money\index.js").Path
Copy-Item $p "$p.bak2" -Force
Write-Host "Cadangan: $p.bak2"

$t = [IO.File]::ReadAllText($p)

$peta = [ordered]@{
  # --- warna beralfa yang lolos tahap pertama ---
  "'#161b2280'"                        = "'var(--surface-2)'"
  "'1px solid #f8514940'"              = "'1px solid var(--danger)'"

  # --- font: Sora dan JetBrains Mono sudah dicabut dari proyek ---
  "fontFamily: 'Sora, sans-serif'"     = "fontFamily: 'var(--font-display)'"
  "fontFamily: 'JetBrains Mono, monospace'" = "fontFamily: 'var(--font-body)'"

  # --- radius: tiga tingkat jadi dua ---
  "borderRadius: 20"                   = "borderRadius: 'var(--radius-full)'"
  "borderRadius: 8"                    = "borderRadius: 'var(--radius-sm)'"
  "borderRadius: 6"                    = "borderRadius: 'var(--radius-sm)'"

  # --- ukuran huruf: sembilan nilai jadi tujuh langkah token ---
  "fontSize: 32"                       = "fontSize: 'var(--text-2xl)'"
  "fontSize: 24"                       = "fontSize: 'var(--text-xl)'"
  "fontSize: 20"                       = "fontSize: 'var(--text-xl)'"
  "fontSize: 17"                       = "fontSize: 'var(--text-lg)'"
  "fontSize: 14"                       = "fontSize: 'var(--text-sm)'"
  "fontSize: 13"                       = "fontSize: 'var(--text-sm)'"
  "fontSize: 12"                       = "fontSize: 'var(--text-xs)'"
  "fontSize: 11"                        = "fontSize: 'var(--text-2xs)'"
  "fontSize: 10"                        = "fontSize: 'var(--text-2xs)'"

  # --- jarak: dibulatkan ke ritme 4px ---
  "padding: '11px 16px'"               = "padding: 'var(--space-3) var(--space-4)'"
  "padding: '12px 16px'"               = "padding: 'var(--space-3) var(--space-4)'"
  "padding: '8px 12px'"                = "padding: 'var(--space-2) var(--space-3)'"
  "padding: '7px 12px'"                = "padding: 'var(--space-2) var(--space-3)'"
  "padding: '6px 10px'"                = "padding: 'var(--space-2) var(--space-3)'"
  "padding: '5px 10px'"                = "padding: 'var(--space-1) var(--space-3)'"
  "padding: '4px 10px'"                = "padding: 'var(--space-1) var(--space-3)'"
  "padding: '7px 14px'"                = "padding: 'var(--space-2) var(--space-4)'"
  "padding: '9px 6px'"                 = "padding: 'var(--space-2)'"
  "padding: '2px 8px'"                 = "padding: '2px var(--space-2)'"
  "padding: '8px 0'"                   = "padding: 'var(--space-2) 0'"
  "padding: '6px'"                     = "padding: 'var(--space-2)'"
}

$total = 0
foreach ($k in $peta.Keys) {
  $n = ([regex]::Matches($t, [regex]::Escape($k))).Count
  if ($n -gt 0) {
    $t = $t.Replace($k, $peta[$k])
    Write-Host ("  {0,-42} {1}x" -f $k, $n)
    $total += $n
  }
}

[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
Write-Host "`nTotal diganti: $total"
Write-Host "`nSisa nilai keras yang perlu dicek manual:"
Select-String -Path $p -Pattern '#[0-9a-fA-F]{6}|fontSize: [0-9]|borderRadius: [0-9]'
