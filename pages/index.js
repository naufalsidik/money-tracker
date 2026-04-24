import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import Head from 'next/head'
import { MONTHS_ID, VAR_CATEGORIES, CATEGORY_COLORS } from '../lib/constants'

const FIXED_ITEMS = ['Kosan', 'Internet', 'iCloud', 'Claude', 'Apple Music']

function formatRp(num) {
  if (!num) return 'Rp0'
  return 'Rp' + Number(num).toLocaleString('id-ID')
}

function maskRp() {
  return 'Rp•••••'
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
  const [hideNominal, setHideNominal] = useState(false)

  // Load hide preference dari localStorage saat mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mt_hide_nominal')
      if (saved === '1') setHideNominal(true)
    } catch {}
  }, [])

  function toggleHide() {
    const next = !hideNominal
    setHideNominal(next)
    try {
      localStorage.setItem('mt_hide_nominal', next ? '1' : '0')
    } catch {}
  }

  // Helper: tampilkan nominal atau masked tergantung state
  const showRp = (num) => hideNominal ? maskRp() : formatRp(num)

  // Form state: type = variable/income/saving, subType = variable/fixed (untuk pengeluaran)
  const [formType, setFormType] = useState('variable')
  const [expenseKind, setExpenseKind] = useState('variable') // 'variable' atau 'fixed'
  const [formData, setFormData] = useState({
    date: todayFormatted(),
    description: '',
    category: '',
    amount: '',
    component: '',
    item: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  const [initLoading, setInitLoading] = useState(false)
  const [initMsg, setInitMsg] = useState('')
  const [editingRow, setEditingRow] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)

  function resetForm() {
    setFormData({
      date: todayFormatted(),
      description: '',
      category: '',
      amount: '',
      component: '',
      item: '',
    })
  }

  async function handleDelete(row, type) {
    const label = type === 'saving' ? row.component : row.description
    if (!confirm(`Hapus "${label}" - ${formatRp(row.amount)}?`)) return
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', type, rowNum: row.rowNum, sheetName: selectedSheet }),
      })
      if (res.ok) fetchData(selectedSheet)
      else {
        const err = await res.json()
        alert('Gagal menghapus: ' + (err.error || 'coba lagi'))
      }
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
      else {
        const err = await res.json()
        alert('Gagal menyimpan: ' + (err.error || 'coba lagi'))
      }
    } catch { alert('Error.') }
    setEditSaving(false)
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const fetchSheets = useCallback(async () => {
    try {
      const res = await fetch('/api/sheets-list')
      const json = await res.json()
      setAvailableSheets(json.sheets || [])
      return json.sheets || []
    } catch { return [] }
  }, [])

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
      const defaultSheet = sheets.includes(currentMonth)
        ? currentMonth
        : sheets[sheets.length - 1]
      if (defaultSheet) fetchData(defaultSheet)
      else setLoading(false)
    }
    init()
  }, [fetchSheets, fetchData, currentMonth])

  // Submit handler — handle semua tipe termasuk confirm flow untuk fixed
  async function submitData(confirmReplace = false) {
    setSubmitting(true)
    setSubmitMsg('')

    // Tentukan tipe aktual untuk API
    let apiType = formType
    if (formType === 'variable') {
      apiType = expenseKind === 'fixed' ? 'fixed' : 'variable'
    }

    // Siapkan payload sesuai tipe
    let payload = {}
    if (apiType === 'variable') {
      payload = { date: formData.date, description: formData.description, category: formData.category, amount: formData.amount }
    } else if (apiType === 'fixed') {
      payload = { item: formData.item, amount: formData.amount }
    } else if (apiType === 'income') {
      payload = { date: formData.date, description: formData.description, amount: formData.amount }
    } else if (apiType === 'saving') {
      payload = { component: formData.component, amount: formData.amount }
    }

    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: apiType,
          data: payload,
          sheet: selectedSheet,
          confirm: confirmReplace,
        }),
      })

      if (res.status === 409) {
        // Fixed cost: item sudah terisi, minta konfirmasi
        const json = await res.json()
        const newAmount = Number(formData.amount)
        const msg = `Item ${formData.item} sudah terisi Rp${json.existing.toLocaleString('id-ID')}. Replace jadi Rp${newAmount.toLocaleString('id-ID')}?`
        if (confirm(msg)) {
          setSubmitting(false)
          return submitData(true) // recursive call dengan confirm=true
        } else {
          setSubmitMsg('Dibatalkan.')
          setSubmitting(false)
          setTimeout(() => setSubmitMsg(''), 3000)
          return
        }
      }

      if (res.ok) {
        setSubmitMsg('Berhasil ditambahkan!')
        resetForm()
        await fetchData(selectedSheet)

        // Untuk fixed cost, balikin ke tab Transaksi biar user lihat hasilnya
        if (apiType === 'fixed') {
          setTimeout(() => {
            setTab('transactions')
            setSubmitMsg('')
          }, 800)
        } else {
          setTimeout(() => setSubmitMsg(''), 4000)
        }
      } else {
        const err = await res.json()
        setSubmitMsg('Gagal: ' + (err.error || 'Coba lagi'))
        setTimeout(() => setSubmitMsg(''), 4000)
      }
    } catch {
      setSubmitMsg('Error. Coba lagi.')
      setTimeout(() => setSubmitMsg(''), 4000)
    }
    setSubmitting(false)
  }

  function handleSubmit() {
    // Guard minimal di client
    if (!formData.amount) return
    if (formType === 'variable' && expenseKind === 'fixed' && !formData.item) {
      setSubmitMsg('Pilih item dulu.')
      return
    }
    submitData(false)
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
  const totalFixed = data?.summary?.totalFixed || 0
  const totalExpense = totalVar + totalFixed
  const selisih = totalIncome - totalExpense

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
              <span style={{ fontSize: 24 }} aria-hidden="true">💰</span>
              <div>
                <h1 style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2, color: '#e6edf3' }}>Money Tracker</h1>
                {data && <p style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{data.period}</p>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={toggleHide}
                aria-label={hideNominal ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                title={hideNominal ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                style={{
                  fontSize: 14, padding: '7px 12px', borderRadius: 8,
                  border: '1px solid #21262d', background: 'transparent',
                  color: '#8b949e', cursor: 'pointer',
                  fontFamily: 'Sora, sans-serif', lineHeight: 1
                }}
              >
                {hideNominal ? '🙈' : '👁️'}
              </button>
              <button onClick={handleLogout} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: '1px solid #21262d', background: 'transparent', color: '#8b949e', cursor: 'pointer' }}>Keluar</button>
              {selectedSheet && !nextMonthExists && nextMonth && (
                <button
                  onClick={handleInitSheet}
                  disabled={initLoading}
                  style={{
                    fontSize: 12, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #f0a500', background: 'transparent',
                    color: '#f0a500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    whiteSpace: 'nowrap', fontFamily: 'Sora, sans-serif'
                  }}
                >
                  {initLoading ? '⏳' : '✨'} Buat Sheet {nextMonth}
                </button>
              )}
              <select
                aria-label="Pilih bulan"
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
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px', display: 'flex', gap: 24 }} role="tablist">
            {[
              { id: 'dashboard', label: '📊 Dashboard' },
              { id: 'add', label: '➕ Tambah' },
              { id: 'transactions', label: '📋 Transaksi' },
            ].map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    {[
                      { label: 'Total Pemasukan', value: showRp(totalIncome), color: '#3fb950' },
                      { label: 'Total Pengeluaran', value: showRp(totalExpense), color: '#f85149', sub: `Var ${showRp(totalVar)} · Fix ${showRp(totalFixed)}` },
                      { label: 'Sisa', value: showRp(selisih), color: selisih >= 0 ? '#3fb950' : '#f85149' },
                      { label: 'Transaksi', value: data.transactions.length, color: '#e6edf3' },
                    ].map((card, i) => (
                      <div key={i} className="card" style={{ padding: 18 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
                        <p style={{ fontSize: 20, fontWeight: 600, color: card.color }}>{card.value}</p>
                        {card.sub && <p style={{ fontSize: 10, color: '#8b949e', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>{card.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {categoryData.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Breakdown Pengeluaran (Variable)</p>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#8b949e' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}
                            fill="#58a6ff"
                            label={{ position: 'right', fontSize: 11, fill: '#8b949e', formatter: v => showRp(v) }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {data.fixedCost && data.fixedCost.some(f => f.amount > 0) && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Fixed Cost</p>
                      {data.fixedCost.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < data.fixedCost.length - 1 ? '1px solid #21262d' : 'none' }}>
                          <span style={{ fontSize: 13, color: '#e6edf3' }}>{f.item}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 11, color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>{f.percentage}</span>
                            <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: f.amount > 0 ? '#f85149' : '#484f58', minWidth: 100, textAlign: 'right' }}>{showRp(f.amount)}</span>
                          </div>
                        </div>
                      ))}
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
                        <span style={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: '#f85149' }}>{showRp(t.amount)}</span>
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

                    {/* TIPE */}
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
                            onClick={() => {
                              setFormType(t.id)
                              setExpenseKind('variable')
                              resetForm()
                            }}
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

                    {/* Sub-pilihan hanya untuk Pengeluaran */}
                    {formType === 'variable' && (
                      <div style={{ marginBottom: 20 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jenis</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          {[
                            { id: 'variable', label: 'Variable' },
                            { id: 'fixed', label: 'Fixed' },
                          ].map(k => (
                            <button
                              key={k.id}
                              onClick={() => { setExpenseKind(k.id); resetForm() }}
                              style={{
                                padding: '9px 6px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                                cursor: 'pointer', border: 'none', fontFamily: 'Sora, sans-serif',
                                background: expenseKind === k.id ? '#58a6ff' : '#21262d',
                                color: expenseKind === k.id ? '#0d1117' : '#8b949e',
                                transition: 'all 0.15s'
                              }}
                            >
                              {k.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tanggal — hanya untuk Variable dan Income */}
                    {((formType === 'variable' && expenseKind === 'variable') || formType === 'income') && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tanggal (DD/MM/YYYY)</p>
                        <input type="text" placeholder="21/04/2026" value={formData.date}
                          onChange={e => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                    )}

                    {/* Deskripsi — untuk Variable dan Income */}
                    {((formType === 'variable' && expenseKind === 'variable') || formType === 'income') && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deskripsi</p>
                        <input type="text" placeholder="Warung Nasi, Gojek, Gaji..." value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })} maxLength={200} />
                      </div>
                    )}

                    {/* Kategori — untuk Pengeluaran Variable */}
                    {formType === 'variable' && expenseKind === 'variable' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</p>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                          <option value="">Pilih kategori...</option>
                          {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Item — untuk Pengeluaran Fixed */}
                    {formType === 'variable' && expenseKind === 'fixed' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item</p>
                        <select value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })}>
                          <option value="">Pilih item...</option>
                          {FIXED_ITEMS.map(it => <option key={it} value={it}>{it}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Komponen — untuk Saving */}
                    {formType === 'saving' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Komponen</p>
                        <input type="text" placeholder="Dana Darurat, Saham, Reksa Dana..." value={formData.component}
                          onChange={e => setFormData({ ...formData, component: e.target.value })} maxLength={200} />
                      </div>
                    )}

                    {/* Jumlah — untuk semua */}
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 11, color: '#8b949e', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jumlah (Rp)</p>
                      <input type="number" placeholder="50000" value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })} min="0" max="1000000000" />
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
                  {/* Section: Pengeluaran Variable */}
                  <div className="card" style={{ overflow: 'auto' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#f85149', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pengeluaran Variable</span>
                    </div>
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
                          editingRow !== null && editingRow.rowNum === t.rowNum && editingRow.type === 'variable' ? (
                            <tr key={i} style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="text" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                  style={{ padding: '6px 10px', fontSize: 12, width: 90 }} />
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                  style={{ padding: '6px 10px', fontSize: 12 }} maxLength={200} />
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
                          <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: '#8b949e' }}>Belum ada transaksi variable</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Section: Fixed Cost — antara Variable dan Income */}
                  {data.fixedCost && data.fixedCost.length > 0 && (
                    <div className="card" style={{ overflow: 'auto' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#bc8cff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pengeluaran Tetap</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #21262d' }}>
                            {['Item', 'Jumlah', '%', ''].map((h, i) => (
                              <th key={i} style={{ padding: '12px 16px', textAlign: h === 'Jumlah' || h === '%' ? 'right' : 'left', fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.fixedCost.map((f, i) => (
                            editingRow !== null && editingRow.rowNum === f.rowNum && editingRow.type === 'fixed' ? (
                              <tr key={i} style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                                <td style={{ padding: '11px 16px', color: '#e6edf3' }}>{f.item}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                  <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', width: 120 }} min="0" />
                                </td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8b949e' }}>{f.percentage}</td>
                                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => handleSaveEdit('fixed')} disabled={editSaving}
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
                                <td style={{ padding: '11px 16px', color: '#e6edf3' }}>{f.item}</td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: f.amount > 0 ? '#f85149' : '#484f58' }}>{formatRp(f.amount)}</td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#8b949e' }}>{f.percentage}</td>
                                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => { setEditingRow({ ...f, type: 'fixed' }); setEditForm({ amount: f.amount }) }}
                                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer' }}>
                                    Edit
                                  </button>
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Section: Pemasukan */}
                  {data.income.length > 0 && (
                    <div className="card" style={{ overflow: 'auto' }}>
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
                                    style={{ padding: '6px 10px', fontSize: 12 }} maxLength={200} />
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

                  {/* Section: Saving */}
                  {data.saving && data.saving.length > 0 && (
                    <div className="card" style={{ overflow: 'auto' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#58a6ff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tabungan / Investasi</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <tbody>
                          {data.saving.map((s, i) => (
                            editingRow !== null && editingRow.rowNum === s.rowNum && editingRow.type === 'saving' ? (
                              <tr key={i} style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}>
                                <td style={{ padding: '8px 12px' }}>
                                  <input type="text" value={editForm.component} onChange={e => setEditForm({ ...editForm, component: e.target.value })}
                                    style={{ padding: '6px 10px', fontSize: 12 }} maxLength={200} />
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    style={{ padding: '6px 10px', fontSize: 12, textAlign: 'right', width: 110 }} />
                                </td>
                                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => handleSaveEdit('saving')} disabled={editSaving}
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
                                <td style={{ padding: '11px 16px', color: '#e6edf3' }}>{s.component}</td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: '#58a6ff' }}>{formatRp(s.amount)}</td>
                                <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => { setEditingRow({ ...s, type: 'saving' }); setEditForm({ component: s.component, amount: s.amount }) }}
                                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #30363d', background: 'transparent', color: '#8b949e', cursor: 'pointer', marginRight: 6 }}>
                                    Edit
                                  </button>
                                  <button onClick={() => handleDelete(s, 'saving')}
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

            </>
          )}
        </main>
      </div>
    </>
  )
}

import { requireAuth } from '../lib/auth'
export const getServerSideProps = requireAuth()
