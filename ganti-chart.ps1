# Tahap tiga: perbaiki chart di pages\money\index.js
#   - label nominal di kanan bar tidak terpotong lagi
#   - label kategori rata kiri, tidak menggantung di tengah
#   - teks chart memakai font yang sama dengan sisa aplikasi
#
# Jalankan sekali dari akar proyek:  .\ganti-chart.ps1

$p = (Resolve-Path "pages\money\index.js").Path
Copy-Item $p "$p.bak3" -Force
Write-Host "Cadangan: $p.bak3"

$t = [IO.File]::ReadAllText($p)

$peta = [ordered]@{

  # --- Bar chart: ruang kanan 24px tidak cukup untuk "Rp2.000.000".
  #     Dinaikkan ke 96px supaya label nominal muat penuh. ---
  '<BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>' = '<BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 96, top: 4, bottom: 4 }}>'

  # --- Label kategori: textAnchor start membuatnya rata kiri.
  #     Tanpa ini Recharts memusatkannya di dalam lebar 110px. ---
  '<YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: ''var(--muted)'' }} />' = '<YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: ''var(--ink-2)'', textAnchor: ''start'', dx: -112, fontFamily: ''var(--font-body)'' }} />'

  # --- Nominal di ujung bar: ukuran dan font disamakan ---
  "label={{ position: 'right', fontSize: 11, fill: 'var(--muted)', formatter: v => showRp(v) }}" = "label={{ position: 'right', fontSize: 13, fill: 'var(--ink-2)', fontFamily: 'var(--font-body)', formatter: v => showRp(v) }}"

  # --- Line chart: sumbu ikut font dan ukuran token ---
  '<XAxis dataKey="date" tick={{ fontSize: 10, fill: ''var(--muted)'' }} />' = '<XAxis dataKey="date" tick={{ fontSize: 12, fill: ''var(--muted)'', fontFamily: ''var(--font-body)'' }} axisLine={{ stroke: ''var(--border)'' }} tickLine={false} />'
  '<YAxis tick={{ fontSize: 10, fill: ''var(--muted)'' }} />' = '<YAxis tick={{ fontSize: 12, fill: ''var(--muted)'', fontFamily: ''var(--font-body)'' }} axisLine={false} tickLine={false} width={72} />'
  '<Legend wrapperStyle={{ fontSize: 12 }} />' = '<Legend wrapperStyle={{ fontSize: 13, fontFamily: ''var(--font-body)'' }} />'
}

$total = 0
foreach ($k in $peta.Keys) {
  $n = ([regex]::Matches($t, [regex]::Escape($k))).Count
  if ($n -gt 0) {
    $t = $t.Replace($k, $peta[$k])
    Write-Host ("  cocok: {0}x  ->  {1}" -f $n, $k.Substring(0, [Math]::Min(46, $k.Length)))
    $total += $n
  } else {
    Write-Host ("  TIDAK COCOK: {0}" -f $k.Substring(0, [Math]::Min(60, $k.Length))) -ForegroundColor Yellow
  }
}

[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
Write-Host "`nTotal diganti: $total"
