import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import Head from 'next/head'

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const VAR_CATEGORIES = [
  'Belanja', 'Donasi', 'Hiburan', 'Hutang', 'Jajan', 'Kebutuhan',
  'Kesehatan', 'Lain-lain', 'Laundry', 'Makan', 'Parkir',
  'Pendidikan', 'Perawatan Diri', 'Transportasi'
]

const CATEGORY_COLORS = {
  Hutang: '#f85149', Makan: '#3fb950', Jajan: '#f0a500',
  Transportasi: '#58a6ff', Belanja: '#bc8cff', Donasi: '#39d353',
  Parkir: '#ffa657', Laundry: '#79c0ff', Pendidikan: '#d2a8ff',
  Kebutuhan: '#56d364', Kesehatan: '#ff7b72', Hiburan: '#e3b341',
  'Perawatan Diri': '#f778ba', 'Lain-lain': '#8b949e',
}

function formatRp(num) {
  if (!num) return 'Rp0'
  return 'Rp' + Number(num).toLocaleString('id-ID')
}

function todayFormatted() {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function getCurrentMonthName() {
  const now = new Date()
  const day = now.getDate()
  if (day >= 20) return MONTHS_ID[now.getMonth()]
  const prevIdx = now.getMonth() - 1
  return MONTHS_ID[prevIdx < 0 ? 11 : prevIdx]
}

function getNextMonthName(current) {
  const idx = MONTHS_ID.indexOf(current)
  if (idx === -1) return null
  return MONTHS_ID[(idx + 1) % 12]
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#8b949e', marginBottom: 4, fontSize: 12 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 13 }}>{p.name}: {formatRp(p.value)}</p>
      ))}
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [availableSheets, setAvailableSheets] = useState([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [currentMonth] = useState(getCurrentMonthName())
  const [formType, setFormType] = useState('variable')
  const [formData, setFormData] = useState({ date: todayFormatted(), description: '', category: '', amount: '', component: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [initLoading, setInitLoading] = useState(false)
  const [initMsg, setInitMsg] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  async function handleDelete(row, type) {
    if (!confirm(`Hapus transaksi "${row.description}" - ${formatRp(row.amount)}?`)) return
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', type, rowNum: row.rowNum, sheetName: selectedSheet }),
      })
      if (res.ok) fetchData(selectedSheet)
      else alert('Gagal menghapus.')
    } catch { alert('Error.') }
  }

  async function handleSaveEdit(type) {
    setEditSaving(true)
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', type, rowNum: editingRow.rowNum, sheetName: selectedSheet, data: editForm }),
      })
      if (res.ok) { setEditingRow(null); fetchData(selectedSheet) }
      else alert('Gagal menyimpan.')
    } catch { alert('Error.') }
    setEditSaving(false)
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  // Fetch available sheets
  const fetchSheets = useCallback(async () => {
    try {
      const res = await fetch('/api/sheets-list')
      const json = await res.json()
      setAvailableSheets(json.sheets || [])
      return json.sheets || []
    } catch { return [] }
  }, [])

  // Fetch data for selected sheet
  const fetchData = useCallback(async (sheet) => {
    setLoading(true)
    try {
      const url = sheet ? `/api/data?sheet=${encodeURIComponent(sheet)}` : '/api/data'
      const res = await fetch(url)
      const json = await res.json()
      setData(json)
      setSelectedSheet(json.sheetName)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const sheets = await fetchSheets()
      // Default to current period month if it exists, otherwise latest
      const defaultSheet = sheets.includes(currentMonth)
        ? currentMonth
        : sheets[sheets.length - 1]
      if (defaultSheet) fetchData(defaultSheet)
      else setLoading(false)
    }
    init()
  }, [fetchSheets, fetchData, currentMonth])

  async function handleSubmit() {
    if (!formData.amount) return
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: formType, data: formData, sheet: selectedSheet }),
      })
      if (res.ok) {
        setSubmitMsg('Berhasil ditambahkan!')
        setFormData({ date: todayFormatted(), description: '', category: '', amount: '', component: '' })
        fetchData(selectedSheet)
      } else {
        const err = await res.json()
        setSubmitMsg('Gagal: ' + (err.error || 'Coba lagi'))
      }
    } catch {
      setSubmitMsg('Error. Coba lagi.')
    }
    setSubmitting(false)
    setTimeout(() => setSubmitMsg(''), 4000)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalysis('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: data.summary,
          transactions: data.transactions,
          income: data.income,
          period: data.period,
        }),
      })
      const json = await res.json()
      setAnalysis(json.analysis || json.error)
    } catch {
      setAnalysis('Gagal mengambil analisis.')
    }
    setAnalyzing(false)
  }

  async function handleInitSheet() {
    const nextMonth = getNextMonthName(selectedSheet)
    if (!nextMonth) return
    setInitLoading(true)
    setInitMsg('')
    try {
      const res = await fetch('/api/init-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newMonth: nextMonth, sourceMonth: selectedSheet }),
      })
      const json = await res.json()
      if (res.ok) {
        setInitMsg(json.message)
        const sheets = await fetchSheets()
        setAvailableSheets(sheets)
        fetchData(nextMonth)
      } else {
        setInitMsg('Gagal: ' + json.error)
      }
    } catch {
      setInitMsg('Error saat membuat sheet.')
    }
    setInitLoading(false)
    setTimeout(() => setInitMsg(''), 5000)
  }

  const nextMonth = getNextMonthName(selectedSheet)
  const nextMonthExists = availableSheets.includes(nextMonth)
  const categoryData = data
    ? Object.entries(data.summary?.categoryBreakdown || {})
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value }))
    : []
  const rekapData = data?.rekap?.slice(0, 20).map(r => ({
    date: r.date, Pengeluaran: r.jumlah, Budget: r.wajar,
  })) || []
  const totalIncome = data?.summary?.totalIncome || 0
  const totalVar = data?.summary?.totalVariable || 0
  const selisih = totalIncome - totalVar

  return (
    <>
      <Head>
        <title>Money Tracker</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen" style={{ background: '#0d1117', fontFamily: 'Sora, sans-serif' }}>
        {/* Header */}
        <header style={{ borderBottom: '1px solid #21262d' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>💰</span>
              <div>
                <h1 style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2, color: '#e6edf3' }}>Money Tracker</h1>
                {data && <p style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{data.period}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Logout */}
              <button onClick={handleLogout} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid #21262d', background: 'transparent', color: '#8b949e', cursor: 'pointer' }}>Keluar</button>
              {/* Create next month button */}
              {selectedSheet && !nextMonthExists && nextMonth && (
                <button
                  onClick={handleInitSheet}
                  disabled={initLoading}
                  style={{
                    fontSize: 12, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #f0a500', background: 'transparent',
                    color: '#f0a500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                  }}
                >
                  {initLoading ? '⏳' : '✨'} Buat Sheet {nextMonth}
                </button>
              )}
              <select
                style={{
                  background: '#161b22', border: '1px solid #21262d', borderRadius: 8,
                  color: '#e6edf3', padding: '7px 12px', fontSize: 13, outline: 'none'
                }}
                value={selectedSheet}
                onChange={e => { setSelectedSheet(e.target.value); fetchData(e.target.value) }}
              >
                {availableSheets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {initMsg && (
            <div style={{ textAlign: 'center', padding: '6px', fontSize: 12, background: '#161b22', color: '#3fb950' }}>
              {initMsg}
            </div>
          )}
          {/* Tabs */}
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 24 }}>
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'add', label: '➕ Tambah' },
              { id: 'transactions', label: '📋 Transaksi' },
              { id: 'analysis', label: '🤖 Analisis AI' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '12px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  background: 'none', border: 'none',
                  borderBottom: tab === t.id ? '2px solid #f0a500' : '2px solid transparent',
                  color: tab === t.id ? '#f0a500' : '#8b949e',
                  transition: 'all 0.15s', fontFamily: 'Sora, sans-serif'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <div className="spinner"></div>
            </div>
          )}

          {!loading && !data && (
            <div style={{ textAlign: 'center', paddingTop: 80, color: '#8b949e' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📭</p>
              <p>Tidak ada data ditemukan. Pastikan nama sheet sesuai dengan bulan dalam bahasa Indonesia.</p>
            </div>
          )}

          {!loading && data && (
            <>
              {/* DASHBOARD */}
              {tab === 'dashboard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[
                      { label: 'Total Pemasukan', value: formatRp(totalIncome), color: '#3fb950' },
                      { label: 'Total Pengeluaran', value: formatRp(totalVar), color: '#f85149' },
                      { label: 'Sisa', value: formatRp(selisih), color: selisih >= 0 ? '#3fb950' : '#f85149' },
                      { label: 'Transaksi', value: data.transactions.length, color: '#e6edf3' },
                    ].map((card, i) => (
                      <div key={i} className="card" style={{ padding: 18 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 600, color: card.color }}>{card.value}</p>
                      </div>
                    ))}
                  </div>

                  {categoryData.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Breakdown Pengeluaran</p>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#8b949e' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}
                            fill="#58a6ff"
                            label={{ position: 'right', fontSize: 11, fill: '#8b949e', formatter: v => formatRp(v) }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {rekapData.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Pengeluaran Harian vs Budget</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={rekapData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8b949e' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#8b949e' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="Pengeluaran" stroke="#f85149" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="Budget" stroke="#f0a500" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="card" style={{ padding: 20 }}>
                    <p style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Transaksi Terbaru</p>
                    {[...data.transactions].reverse().slice(0, 5).map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #21262d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace', minWidth: 55 }}>{t.date}</span>
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500,
                            background: (CATEGORY_COLORS[t.category] || '#58a6ff') + '22',
                            color: CATEGORY_COLORS[t.category] || '#58a6ff'
                          }}>{t.category}</span>
                          <span style={{ fontSize: 13, color: '#e6edf3' }}>{t.description}</span>
                        </div>
                        <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#f85149' }}>{formatRp(t.amount)}</span>
                      </div>
                    ))}
                    {data.transactions.length === 0 && (
                      <p style={{ color: '#8b949e', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Belum ada transaksi</p>
                    )}
                  </div>
                </div>
              )}

              {/* ADD */}
              {tab === 'add' && (
                <div style={{ maxWidth: 460, margin: '0 auto' }}>
                  <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontWeight: 600, fontSize: 17, marginBottom: 20, color: '#e6edf3' }}>Tambah Data</h2>

                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipe</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[
                          { id: 'variable', label: '💸 Pengeluaran' },
                          { id: 'income', label: '💰 Pemasukan' },
                          { id: 'saving', label: '🏦 Tabungan' },
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setFormType(t.id); setFormData({ date: todayFormatted(), description: '', category: '', amount: '', component: '' }) }}
                            style={{
                              padding: '9px 6px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                              cursor: 'pointer', border: 'none', fontFamily: 'Sora, sans-serif',
                              background: formType === t.id ? '#f0a500' : '#21262d',
                              color: formType === t.id ? '#0d1117' : '#8b949e',
                              transition: 'all 0.15s'
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {formType !== 'saving' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal (DD/MM/YYYY)</p>
                        <input type="text" placeholder="21/04/2026" value={formData.date}
                          onChange={e => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                    )}

                    {formType !== 'saving' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi</p>
                        <input type="text" placeholder="Warung Nasi, Gojek, Gaji..." value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })} />
                      </div>
                    )}

                    {formType === 'variable' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</p>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                          <option value="">Pilih kategori...</option>
                          {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}

                    {formType === 'saving' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Komponen</p>
                        <input type="text" placeholder="Dana Darurat, Saham, Reksa Dana..." value={formData.component}
                          onChange={e => setFormData({ ...formData, component: e.target.value })} />
                      </div>
                    )}

                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jumlah (Rp)</p>
                      <input type="number" placeholder="50000" value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                    </div>

                    <button className="btn-primary" onClick={handleSubmit} disabled={submitting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {submitting ? <><div className="spinner"></div> Menyimpan...</> : 'Simpan ke Spreadsheet'}
                    </button>

                    {submitMsg && (
                      <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: submitMsg.includes('Berhasil') ? '#3fb950' : '#f85149' }}>
                        {submitMsg}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TRANSACTIONS */}
              {tab === 'transactions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #21262d' }}>
                          {['Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', ''].map((h, i) => (
                            <th key={i} style={{ padding: '12px 16px', textAlign: h === 'Jumlah' ? 'right' : 'left', fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.transactions].reverse().map((t, i) => (
                          editingRow !== null && editingRow.rowNum === t.rowNum && editingRow.type !== 'income' ? (
                            <tr key={i} style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="text" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                  style={{ padding: '6px 10px', fontSize: 12, width: 90 }} />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                  style={{ padding: '6px 10px', fontSize: 12 }} />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                  style={{ padding: '6px 10px', fontSize: 12 }}>
                                  {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                  style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', width: 100 }} />
                              </td>
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                <button onClick={() => handleSaveEdit('variable')} disabled={editSaving}
                                  style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#3fb950', color: '#0d1117', cursor: 'pointer', marginRight: 6, fontWeight: 600 }}>
                                  {editSaving ? '...' : 'Simpan'}
                                </button>
                                <button onClick={() => setEditingRow(null)}
                                  style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer' }}>
                                  Batal
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={i} style={{ borderBottom: '1px solid #21262d' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#161b2280'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8b949e' }}>{t.date}</td>
                              <td style={{ padding: '11px 16px', color: '#e6edf3' }}>{t.description}</td>
                              <td style={{ padding: '11px 16px' }}>
                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: (CATEGORY_COLORS[t.category] || '#58a6ff') + '22', color: CATEGORY_COLORS[t.category] || '#58a6ff' }}>{t.category}</span>
                              </td>
                              <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#f85149' }}>{formatRp(t.amount)}</td>
                              <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                <button onClick={() => { setEditingRow({ ...t, type: 'variable' }); setEditForm({ date: t.date, description: t.description, category: t.category, amount: t.amount }) }}
                                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer', marginRight: 6 }}>
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(t, 'variable')}
                                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #f8514940', background: 'transparent', color: '#f85149', cursor: 'pointer' }}>
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          )
                        ))}
                        {data.transactions.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#8b949e' }}>Belum ada transaksi</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {data.income.length > 0 && (
                    <div className="card" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#3fb950', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pemasukan</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {data.income.map((t, i) => (
                            editingRow !== null && editingRow.rowNum === t.rowNum && editingRow.type === 'income' ? (
                              <tr key={i} style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                                <td style={{ padding: '8px 12px', width: 100 }}>
                                  <input type="text" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    style={{ padding: '6px 10px', fontSize: 12, width: 90 }} />
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    style={{ padding: '6px 10px', fontSize: 12 }} />
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', width: 110 }} />
                                </td>
                                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => handleSaveEdit('income')} disabled={editSaving}
                                    style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#3fb950', color: '#0d1117', cursor: 'pointer', marginRight: 6, fontWeight: 600 }}>
                                    {editSaving ? '...' : 'Simpan'}
                                  </button>
                                  <button onClick={() => setEditingRow(null)}
                                    style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer' }}>
                                    Batal
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={i} style={{ borderBottom: '1px solid #21262d' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#161b2280'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '11px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8b949e', width: 100 }}>{t.date}</td>
                                <td style={{ padding: '11px 16px', color: '#e6edf3' }}>{t.description}</td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#3fb950' }}>{formatRp(t.amount)}</td>
                                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => { setEditingRow({ ...t, type: 'income' }); setEditForm({ date: t.date, description: t.description, amount: t.amount }) }}
                                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer', marginRight: 6 }}>
                                    Edit
                                  </button>
                                  <button onClick={() => handleDelete(t, 'income')}
                                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #f8514940', background: 'transparent', color: '#f85149', cursor: 'pointer' }}>
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}


              {/* AI ANALYSIS */}
              {tab === 'analysis' && (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  <div className="card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div>
                        <h2 style={{ fontWeight: 600, fontSize: 17, color: '#e6edf3' }}>Analisis AI</h2>
                        <p style={{ fontSize: 11, color: '#8b949e', marginTop: 4 }}>Periode: {data.period}</p>
                      </div>
                      <button className="btn-primary" onClick={handleAnalyze} disabled={analyzing}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        {analyzing ? <><div className="spinner"></div> Menganalisa...</> : '🤖 Analisa Sekarang'}
                      </button>
                    </div>

                    {!analysis && !analyzing && (
                      <div style={{ textAlign: 'center', padding: '48px 0', color: '#8b949e' }}>
                        <p style={{ fontSize: 40, marginBottom: 12 }}>🤖</p>
                        <p style={{ fontSize: 13 }}>Klik tombol di atas untuk mendapatkan analisis keuangan bulan ini</p>
                      </div>
                    )}

                    {analysis && (
                      <div
                        style={{ fontSize: 14, lineHeight: 1.8, color: '#c9d1d9', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{
                          __html: analysis
                            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f0a500">$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}

import { requireAuth } from '../lib/auth'
export const getServerSideProps = requireAuth()
