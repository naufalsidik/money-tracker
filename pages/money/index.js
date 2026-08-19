import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'
import Shell from '../../components/Shell'
import {
  IkonGrafik, IkonTambah, IkonDaftar,
  IkonMata, IkonMataTutup, IkonLembarBaru,
} from '../../components/icons'
import { MONTHS_ID, VAR_CATEGORIES, CATEGORY_COLORS } from '../../lib/constants'
import MoneyNav from '../../components/MoneyNav'
import { useRouter } from 'next/router'

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
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
      <p style={{ color: 'var(--muted)', marginBottom: 4, fontSize: 'var(--text-xs)' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: 'var(--text-sm)' }}>{p.name}: {formatRp(p.value)}</p>
      ))}
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState('dashboard')
  const router = useRouter()
 
  // Tab ikut disimpan di URL sebagai ?tab=. Tanpa ini, tautan dari halaman
  // Rutin atau Target tidak punya cara menunjuk bagian tertentu dan selalu
  // mendarat di Dashboard.
  useEffect(() => {
    const t = router.query.tab
    if (typeof t === 'string' && ['dashboard', 'add', 'transactions'].includes(t)) {
      setTab(t)
    }
  }, [router.query.tab])
 
  // shallow: true menahan Next menjalankan ulang getServerSideProps.
  // Berpindah tab tidak butuh data baru dari server, jadi tanpa ini
  // setiap klik memicu pemeriksaan sesi yang sia-sia.
  function gantiTab(id) {
    setTab(id)
    router.replace({ pathname: '/money', query: { tab: id } }, undefined, { shallow: true })
  }
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
      const res = await fetch('/api/money/edit', {
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
      const res = await fetch('/api/money/edit', {
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

  const fetchSheets = useCallback(async () => {
    try {
      const res = await fetch('/api/money/sheets-list')
      const json = await res.json()
      setAvailableSheets(json.sheets || [])
      return json.sheets || []
    } catch { return [] }
  }, [])

  const fetchData = useCallback(async (sheet) => {
    setLoading(true)
    try {
      const url = sheet ? `/api/money/data?sheet=${encodeURIComponent(sheet)}` : '/api/money/data'
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
      const res = await fetch('/api/money/add', {
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
      const res = await fetch('/api/money/init-sheet', {
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
  const rekapData = data?.rekap?.slice(0, 30).map(r => ({
    date: r.date, Pengeluaran: r.jumlah, Budget: r.wajar,
  })) || []
  const totalIncome = data?.summary?.totalIncome || 0
  const totalVar = data?.summary?.totalVariable || 0
  const totalFixed = data?.summary?.totalFixed || 0
  const totalSaving = data?.summary?.totalSaving || 0
  const totalExpense = totalVar + totalFixed
  const selisih = totalIncome - totalExpense - totalSaving

  return (
    <Shell title="Money Tracker">
        {/* Header */}
<header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{
            padding: 'var(--space-5) var(--pad-section) var(--space-4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: 'var(--space-6) var(--space-8)', flexWrap: 'wrap',
          }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)', fontWeight: 800,
                fontSize: 'var(--text-2xl)', lineHeight: 'var(--leading-tight)',
                letterSpacing: 'var(--tracking-tight)', color: 'var(--ink)',
              }}>Money Tracker</h1>
              {data && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 'var(--space-2)' }}>
                  {data.period}
                </p>
              )}
            </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <button
                  onClick={toggleHide}
                aria-label={hideNominal ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                aria-pressed={hideNominal}
                title={hideNominal ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--ink-2)', cursor: 'pointer',
                }}
              >
                {hideNominal ? <IkonMataTutup /> : <IkonMata />}
              </button>

              {selectedSheet && !nextMonthExists && nextMonth && (
                <button
                  onClick={handleInitSheet}
                  disabled={initLoading}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                    minHeight: 44, padding: '0 var(--space-4)',
                    fontSize: 'var(--text-sm)', fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--ink)', cursor: initLoading ? 'not-allowed' : 'pointer',
                    opacity: initLoading ? 0.55 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  <IkonLembarBaru />
                  {initLoading ? 'Membuat…' : `Buat Sheet ${nextMonth}`}
                </button>
              )}

              <select
                aria-label="Pilih bulan"
                style={{
                  width: 'auto', minHeight: 44, background: 'var(--surface)',
                  fontSize: 'var(--text-sm)', fontWeight: 600,
                }}
                value={selectedSheet}
                onChange={e => { setSelectedSheet(e.target.value); fetchData(e.target.value) }}
              >
                {availableSheets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {initMsg && (
            <div style={{
              padding: 'var(--space-2) var(--pad-section)',
              fontSize: 'var(--text-sm)', color: 'var(--money-in)',
              borderTop: '1px solid var(--border)',
            }}>
              {initMsg}
            </div>
          )}

          {/* Tab tetap bergaris bawah, bukan chip. Tab berpindah tampilan,
              chip di Job Tracker menyaring daftar yang sama — fungsinya beda,
              jadi bentuknya sengaja tidak disamakan. Yang diseragamkan hanya
              tinggi, warna, dan ukuran hurufnya. */}
          <MoneyNav tab={tab} onTab={gantiTab} />
        </header>

        <main style={{ padding: 'var(--space-6) var(--pad-section)' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
              <div className="spinner"></div>
            </div>
          )}

          {!loading && !data && (
            <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--muted)' }}>
              
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
                      { label: 'Total Pemasukan', value: showRp(totalIncome), color: 'var(--money-in)' },
                      { label: 'Total Pengeluaran', value: showRp(totalExpense), color: 'var(--money-out)', sub: `Var ${showRp(totalVar)} · Fix ${showRp(totalFixed)}` },
                      { label: 'Sisa', value: showRp(selisih), color: selisih >= 0 ? 'var(--money-in)' : 'var(--money-out)', sub: `Setelah tabungan ${showRp(totalSaving)}` },
                      { label: 'Transaksi', value: data.transactions.length, color: 'var(--ink)' },
                    ].map((card, i) => (
                      <div key={i} className="card" style={{ padding: 'var(--pad-card)' }}>
                        <p style={{
                          fontSize: 'var(--text-2xs)', color: 'var(--muted)',
                          marginBottom: 'var(--space-1)', textTransform: 'uppercase',
                          letterSpacing: 'var(--tracking-label)',
                        }}>{card.label}</p>
                        <p className="num" style={{
                          fontSize: 'var(--text-2xl)', fontWeight: 500, color: card.color,
                          lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tight)',
                        }}>{card.value}</p>
                        {card.sub && (
                          <p style={{
                            fontSize: 'var(--text-xs)', color: 'var(--muted)',
                            marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
                            borderTop: '1px solid var(--border)',
                          }}>{card.sub}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {categoryData.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', marginBottom: 16 }}>Breakdown Pengeluaran (Variable)</p>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 96, top: 4, bottom: 4 }}>
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 'var(--text-xs)', fill: 'var(--muted)' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}
                            fill="var(--money-plan)"
                            label={{ position: 'right', fontSize: 'var(--text-2xs)', fill: 'var(--muted)', formatter: v => showRp(v) }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {data.fixedCost && data.fixedCost.some(f => f.amount > 0) && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', marginBottom: 12 }}>Fixed Cost</p>
                      {data.fixedCost.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: i < data.fixedCost.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>{f.item}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>{f.percentage}</span>
                            <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', color: f.amount > 0 ? 'var(--money-out)' : 'var(--muted)', minWidth: 100, textAlign: 'right' }}>{showRp(f.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {rekapData.length > 0 && (
                    <div className="card" style={{ padding: 20 }}>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', marginBottom: 16 }}>Pengeluaran Harian vs Budget</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={rekapData} margin={{ left: 0, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="date" tick={{ fontSize: 'var(--text-2xs)', fill: 'var(--muted)' }} />
                          <YAxis tick={{ fontSize: 'var(--text-2xs)', fill: 'var(--muted)' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 'var(--text-xs)' }} />
                          <Line type="monotone" dataKey="Pengeluaran" stroke="var(--money-out)" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="Budget" stroke="var(--accent)" dot={false} strokeWidth={1.5} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="card" style={{ padding: 20 }}>
                    <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', marginBottom: 16 }}>Transaksi Terbaru</p>
                    {[...data.transactions].reverse().slice(0, 5).map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', fontFamily: 'var(--font-body)', minWidth: 55 }}>{t.date}</span>
                          <span style={{
                            fontSize: 'var(--text-2xs)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-full)', fontWeight: 500,
                            background: (CATEGORY_COLORS[t.category] || 'var(--money-plan)') + '22',
                            color: CATEGORY_COLORS[t.category] || 'var(--money-plan)'
                          }}>{t.category}</span>
                          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>{t.description}</span>
                        </div>
                        <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', color: 'var(--money-out)' }}>{showRp(t.amount)}</span>
                      </div>
                    ))}
                    {data.transactions.length === 0 && (
                      <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: '20px 0' }}>Belum ada transaksi</p>
                    )}
                  </div>
                </div>
              )}

              {/* ADD */}
              {tab === 'add' && (
                <div style={{ maxWidth: 460, margin: '0 auto' }}>
                  <div className="card" style={{ padding: 24 }}>
                    <h2 style={{ fontWeight: 600, fontSize: 'var(--text-lg)', marginBottom: 20, color: 'var(--ink)' }}>Tambah Data</h2>

                    {/* TIPE */}
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Tipe</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {[
                          { id: 'variable', label: 'Pengeluaran' },
                          { id: 'income', label: 'Pemasukan' },
                          { id: 'saving', label: 'Tabungan' },
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setFormType(t.id)
                              setExpenseKind('variable')
                              resetForm()
                            }}
                            style={{
                              padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 500,
                              cursor: 'pointer', border: 'none', fontFamily: 'var(--font-display)',
                              background: formType === t.id ? 'var(--accent)' : 'var(--border)',
                              color: formType === t.id ? 'var(--bg)' : 'var(--muted)',
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
                        <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Jenis</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                          {[
                            { id: 'variable', label: 'Variable' },
                            { id: 'fixed', label: 'Fixed' },
                          ].map(k => (
                            <button
                              key={k.id}
                              onClick={() => { setExpenseKind(k.id); resetForm() }}
                              style={{
                                padding: 'var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 500,
                                cursor: 'pointer', border: 'none', fontFamily: 'var(--font-display)',
                                background: expenseKind === k.id ? 'var(--money-plan)' : 'var(--border)',
                                color: expenseKind === k.id ? 'var(--bg)' : 'var(--muted)',
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
                        <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Tanggal (DD/MM/YYYY)</p>
                        <input type="text" placeholder="21/04/2026" value={formData.date}
                          onChange={e => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                    )}

                    {/* Deskripsi — untuk Variable dan Income */}
                    {((formType === 'variable' && expenseKind === 'variable') || formType === 'income') && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Deskripsi</p>
                        <input type="text" placeholder="Warung Nasi, Gojek, Gaji..." value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })} maxLength={200} />
                      </div>
                    )}

                    {/* Kategori — untuk Pengeluaran Variable */}
                    {formType === 'variable' && expenseKind === 'variable' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Kategori</p>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                          <option value="">Pilih kategori...</option>
                          {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Item — untuk Pengeluaran Fixed */}
                    {formType === 'variable' && expenseKind === 'fixed' && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Item</p>
                        <select value={formData.item} onChange={e => setFormData({ ...formData, item: e.target.value })}>
                          <option value="">Pilih item...</option>
                          {FIXED_ITEMS.map(it => <option key={it} value={it}>{it}</option>)}
                        </select>
                      </div>
                    )}

					{/* Komponen — untuk Saving */}
                    {formType === 'saving' && (
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <p style={{
                          fontSize: 'var(--text-2xs)', color: 'var(--muted)',
                          marginBottom: 'var(--space-2)', textTransform: 'uppercase',
                          letterSpacing: 'var(--tracking-label)',
                        }}>Komponen</p>

                        {/* Daftar pilihan datang dari target tabungan yang sudah
                            dibuat. Progres target dihubungkan lewat nama komponen,
                            jadi salah ketik satu huruf memutus riwayatnya. Memilih
                            dari daftar menutup celah itu. Ketik bebas tetap boleh
                            untuk komponen yang belum punya target. */}
                        <input
                          type="text"
                          list="komponen-target"
                          placeholder="Dana Darurat, Saham, Reksa Dana..."
                          value={formData.component}
                          onChange={e => setFormData({ ...formData, component: e.target.value })}
                          maxLength={200}
                          aria-describedby="komponen-bantu"
                        />
                        <datalist id="komponen-target">
                          {(data?.savingGoals || []).map(k => <option key={k} value={k} />)}
                        </datalist>

                        {data?.savingGoals?.length > 0 && (
                          <p id="komponen-bantu" style={{
                            fontSize: 'var(--text-xs)', color: 'var(--muted)',
                            marginTop: 'var(--space-2)',
                          }}>
                            Pilih dari daftar agar masuk ke target tabungan yang sudah ada.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Jumlah — untuk semua */}
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Jumlah (Rp)</p>
                      <input type="number" placeholder="50000" value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })} min="0" max="1000000000" />
                    </div>

                    <button className="btn-primary" onClick={handleSubmit} disabled={submitting}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      {submitting ? <><div className="spinner"></div> Menyimpan...</> : 'Simpan ke Spreadsheet'}
                    </button>

                    {submitMsg && (
                      <p style={{ textAlign: 'center', marginTop: 12, fontSize: 'var(--text-sm)', color: submitMsg.includes('Berhasil') ? 'var(--money-in)' : 'var(--money-out)' }}>
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
                    <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--money-out)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Pengeluaran Variable</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', ''].map((h, i) => (
                            <th key={i} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: h === 'Jumlah' ? 'right' : 'left', fontSize: 'var(--text-2xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.transactions].reverse().map((t, i) => (
                          editingRow !== null && editingRow.rowNum === t.rowNum && editingRow.type === 'variable' ? (
                            <tr key={i} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                <input type="text" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                  style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', width: 90 }} />
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                  style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }} maxLength={200} />
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                  style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }}>
                                  {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                  style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'right', width: 100 }} />
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', whiteSpace: 'nowrap' }}>
                                <button onClick={() => handleSaveEdit('variable')} disabled={editSaving}
                                  style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--money-in)', color: 'var(--bg)', cursor: 'pointer', marginRight: 6, fontWeight: 600 }}>
                                  {editSaving ? '...' : 'Simpan'}
                                </button>
                                <button onClick={() => setEditingRow(null)}
                                  style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                                  Batal
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>{t.date}</td>
                              <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--ink)' }}>{t.description}</td>
                              <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                <span style={{ fontSize: 'var(--text-2xs)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-full)', fontWeight: 500, background: (CATEGORY_COLORS[t.category] || 'var(--money-plan)') + '22', color: CATEGORY_COLORS[t.category] || 'var(--money-plan)' }}>{t.category}</span>
                              </td>
                              <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontFamily: 'var(--font-body)', color: 'var(--money-out)' }}>{formatRp(t.amount)}</td>
                              <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                                <button onClick={() => { setEditingRow({ ...t, type: 'variable' }); setEditForm({ date: t.date, description: t.description, category: t.category, amount: t.amount }) }}
                                  style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', marginRight: 6 }}>
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(t, 'variable')}
                                  style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--money-out)', cursor: 'pointer' }}>
                                  Hapus
                                </button>
                              </td>
                            </tr>
                          )
                        ))}
                        {data.transactions.length === 0 && (
                          <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)' }}>Belum ada transaksi variable</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Section: Fixed Cost — antara Variable dan Income */}
                  {data.fixedCost && data.fixedCost.length > 0 && (
                    <div className="card" style={{ overflow: 'auto' }}>
                      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--st-Screening)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Pengeluaran Tetap</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['Item', 'Jumlah', '%', ''].map((h, i) => (
                              <th key={i} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: h === 'Jumlah' || h === '%' ? 'right' : 'left', fontSize: 'var(--text-2xs)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)', fontWeight: 500 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.fixedCost.map((f, i) => (
                            editingRow !== null && editingRow.rowNum === f.rowNum && editingRow.type === 'fixed' ? (
                              <tr key={i} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--ink)' }}>{f.item}</td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                                  <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'right', width: 120 }} min="0" />
                                </td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>{f.percentage}</td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => handleSaveEdit('fixed')} disabled={editSaving}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--money-in)', color: 'var(--bg)', cursor: 'pointer', marginRight: 6, fontWeight: 600 }}>
                                    {editSaving ? '...' : 'Simpan'}
                                  </button>
                                  <button onClick={() => setEditingRow(null)}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                                    Batal
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--ink)' }}>{f.item}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontFamily: 'var(--font-body)', color: f.amount > 0 ? 'var(--money-out)' : 'var(--muted)' }}>{formatRp(f.amount)}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>{f.percentage}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => { setEditingRow({ ...f, type: 'fixed' }); setEditForm({ amount: f.amount }) }}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
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
                      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--money-in)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Pemasukan</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <tbody>
                          {data.income.map((t, i) => (
                            editingRow !== null && editingRow.rowNum === t.rowNum && editingRow.type === 'income' ? (
                              <tr key={i} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: 'var(--space-2) var(--space-3)', width: 100 }}>
                                  <input type="text" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', width: 90 }} />
                                </td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                  <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }} maxLength={200} />
                                </td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                  <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'right', width: 110 }} />
                                </td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => handleSaveEdit('income')} disabled={editSaving}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--money-in)', color: 'var(--bg)', cursor: 'pointer', marginRight: 6, fontWeight: 600 }}>
                                    {editSaving ? '...' : 'Simpan'}
                                  </button>
                                  <button onClick={() => setEditingRow(null)}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                                    Batal
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-2xs)', color: 'var(--muted)', width: 100 }}>{t.date}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--ink)' }}>{t.description}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontFamily: 'var(--font-body)', color: 'var(--money-in)' }}>{formatRp(t.amount)}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => { setEditingRow({ ...t, type: 'income' }); setEditForm({ date: t.date, description: t.description, amount: t.amount }) }}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', marginRight: 6 }}>
                                    Edit
                                  </button>
                                  <button onClick={() => handleDelete(t, 'income')}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--money-out)', cursor: 'pointer' }}>
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
                      <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--money-plan)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>Tabungan / Investasi</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <tbody>
                          {data.saving.map((s, i) => (
                            editingRow !== null && editingRow.rowNum === s.rowNum && editingRow.type === 'saving' ? (
                              <tr key={i} style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                  <input type="text" value={editForm.component} onChange={e => setEditForm({ ...editForm, component: e.target.value })}
                                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)' }} maxLength={200} />
                                </td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)' }}>
                                  <input type="number" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                                    style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', textAlign: 'right', width: 110 }} />
                                </td>
                                <td style={{ padding: 'var(--space-2) var(--space-3)', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => handleSaveEdit('saving')} disabled={editSaving}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--money-in)', color: 'var(--bg)', cursor: 'pointer', marginRight: 6, fontWeight: 600 }}>
                                    {editSaving ? '...' : 'Simpan'}
                                  </button>
                                  <button onClick={() => setEditingRow(null)}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                                    Batal
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--ink)' }}>{s.component}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontFamily: 'var(--font-body)', color: 'var(--money-plan)' }}>{formatRp(s.amount)}</td>
                                <td style={{ padding: 'var(--space-3) var(--space-4)', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => { setEditingRow({ ...s, type: 'saving' }); setEditForm({ component: s.component, amount: s.amount }) }}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', marginRight: 6 }}>
                                    Edit
                                  </button>
                                  <button onClick={() => handleDelete(s, 'saving')}
                                    style={{ fontSize: 'var(--text-2xs)', padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'transparent', color: 'var(--money-out)', cursor: 'pointer' }}>
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
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
