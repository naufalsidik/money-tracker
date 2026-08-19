import { useState, useEffect, useRef, useCallback } from 'react'
import Shell from '../../components/Shell'

const JENIS = ['MT', 'Magang', 'Tetap', 'Kontrak', 'Freelance']
const TEMPAT = ['WFO', 'WFH', 'Hybrid']
const STATUS = ['Progress', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Ghosted']
const SELESAI = ['Rejected', 'Ghosted', 'Offer']
const DIRESPONS = ['Screening', 'Interview', 'Offer', 'Rejected']
const SKALA_MIN = 21

const KOSONG = {
  perusahaan: '', jabatan: '', lokasi: '', tanggalApply: '',
  jenis: 'Tetap', tempat: 'WFO', status: 'Applied',
  referensi: '', url: '', gaji: '', catatan: '',
}

function hariSejak(d) {
  if (!d) return null
  const t = new Date(d + 'T00:00:00')
  return isNaN(t) ? null : Math.floor((Date.now() - t) / 864e5)
}

function fmt(d) {
  if (!d) return '—'
  const t = new Date(d + 'T00:00:00')
  return isNaN(t) ? d : t.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function api(path, opsi) {
  const r = await fetch(path, opsi)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || 'Gagal menyimpan')
  }
  return r.json()
}

// Warna dan label garis tunggu. Status yang sudah selesai tidak lagi "menunggu",
// jadi diperlakukan terpisah dari yang masih berjalan.
function jalur(a, skala) {
  const h = hariSejak(a.tanggalApply)
  const S = a.status
  if (h === null) return { pct: 0, warna: 'var(--w-mati)', kiri: 'tanggal kosong', kanan: '', strip: false }

  const pct = Math.min(100, Math.max(5, (h / skala) * 100))

  if (S === 'Progress') {
    return {
      pct, warna: 'var(--s-Progress)', strip: true,
      kiri: h === 0 ? 'dicatat hari ini' : `dicatat ${h} hari lalu`,
      kanan: 'belum dikirim',
    }
  }
  if (S === 'Offer') {
    return { pct: 100, warna: 'var(--s-Offer)', kiri: fmt(a.tanggalApply), kanan: 'tawaran masuk', strip: false }
  }
  if (S === 'Rejected' || S === 'Ghosted') {
    return {
      pct, warna: 'var(--w-mati)', strip: false,
      kiri: fmt(a.tanggalApply),
      kanan: S === 'Ghosted' ? 'tanpa kabar' : 'ditolak',
    }
  }

  const warna = h < 8 ? 'var(--w-calm)' : h < 15 ? 'var(--w-warm)' : h < 31 ? 'var(--w-hot)' : 'var(--w-cold)'
  const kanan = h < 15 ? '' : h < 31 ? 'follow up' : 'kejar / tutup'
  return { pct, warna, kiri: h === 0 ? 'dilamar hari ini' : `${h} hari`, kanan, strip: false }
}

const perluAksi = a =>
  a.status === 'Progress' || (!SELESAI.includes(a.status) && (hariSejak(a.tanggalApply) ?? 0) >= 15)

const IkonUbah = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)

const IkonHapus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" />
  </svg>
)

export default function Jobs() {
  const [semua, setSemua] = useState([])
  const [filter, setFilter] = useState('aktif')
  const [q, setQ] = useState('')
  const [urut, setUrut] = useState('lama')
  const [terbuka, setTerbuka] = useState(() => new Set())
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')
  const [siap, setSiap] = useState(false)

  const dialog = useRef(null)

  const muat = useCallback(async () => {
    try {
      setSemua(await api('/api/jobs'))
    } catch (e) {
      setGalat(e.message)
    }
  }, [])

  useEffect(() => { muat() }, [muat])
  useEffect(() => {
    const t = setTimeout(() => setSiap(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!dialog.current) return
    if (draf && !dialog.current.open) dialog.current.showModal()
    if (!draf && dialog.current.open) dialog.current.close()
  }, [draf])

  const hitung = {}
  for (const s of STATUS) hitung[s] = 0
  for (const a of semua) hitung[a.status] = (hitung[a.status] || 0) + 1

  const aktif = semua.filter(a => !SELESAI.includes(a.status)).length
  const aksi = semua.filter(perluAksi).length

  const skala = Math.max(
    SKALA_MIN,
    ...semua.filter(a => !SELESAI.includes(a.status)).map(a => hariSejak(a.tanggalApply) ?? 0)
  )

  const kata = q.trim().toLowerCase()
  let tampil = semua.filter(a =>
    !kata || [a.perusahaan, a.jabatan, a.lokasi, a.referensi, a.catatan].join(' ').toLowerCase().includes(kata)
  )
  if (filter === 'aktif') tampil = tampil.filter(a => !SELESAI.includes(a.status))
  if (filter === 'aksi') tampil = tampil.filter(perluAksi)
  if (filter === 'lanjut') tampil = tampil.filter(a => ['Screening', 'Interview', 'Offer'].includes(a.status))
  if (filter === 'tutup') tampil = tampil.filter(a => ['Rejected', 'Ghosted'].includes(a.status))

  tampil = [...tampil].sort((a, b) =>
    urut === 'nama' ? a.perusahaan.localeCompare(b.perusahaan)
      : urut === 'baru' ? (b.tanggalApply || '').localeCompare(a.tanggalApply || '')
        : (a.tanggalApply || '9999').localeCompare(b.tanggalApply || '9999')
  )

  const segmen = [
    ['dilamar', hitung.Applied + hitung.Progress, '#5B72D8'],
    ['screening', hitung.Screening, '#9268E8'],
    ['interview', hitung.Interview, '#E08A2B'],
    ['offer', hitung.Offer, '#1AA37B'],
    ['ditolak', hitung.Rejected + hitung.Ghosted, '#7C8894'],
  ].filter(s => s[1] > 0)

  const dijawab = semua.filter(a => DIRESPONS.includes(a.status)).length
  const total = semua.length || 1

  const cacah = {
    semua: semua.length, aktif, aksi,
    lanjut: hitung.Screening + hitung.Interview + hitung.Offer,
    tutup: hitung.Rejected + hitung.Ghosted,
  }

  function toggle(id) {
    setTerbuka(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function gantiStatus(a, status) {
    try {
      await api('/api/jobs/' + a.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  async function hapus(a) {
    if (!confirm(`Hapus lamaran ${a.perusahaan} — ${a.jabatan}?`)) return
    try {
      await api('/api/jobs/' + a.id, { method: 'DELETE' })
      setTerbuka(prev => { const s = new Set(prev); s.delete(a.id); return s })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  async function simpan(e) {
    e.preventDefault()
    const { id, ...isi } = draf
    try {
      await api('/api/jobs' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isi),
      })
      setDraf(null)
      muat()
    } catch (err) { setGalat(err.message) }
  }

  const ubahDraf = (k, v) => setDraf(d => ({ ...d, [k]: v }))

  return (
    <Shell title="Papan Tunggu — Lamaran Kerja">
      <div className="papan">
        <div className="topbar">
          <div className="topbar-in">
            <div>
              <h1>Papan Tunggu</h1>
              <div className="tagline">
                {semua.length
                  ? <>{semua.length} lamaran · {aktif} masih berjalan{aksi ? <> · <b>{aksi} perlu ditindaklanjuti</b></> : null}</>
                  : 'belum ada lamaran tercatat'}
              </div>
            </div>
            <div className="pipe">
              <div className="pipe-bar">
                {segmen.map(([nama, n, warna]) => (
                  <span key={nama} style={{ width: `${(n / total) * 100}%`, background: warna }} title={`${n} ${nama}`} />
                ))}
              </div>
              <div className="pipe-legend">
                {segmen.map(([nama, n, warna]) => (
                  <i key={nama}><span className="dot" style={{ background: warna }} />{n} {nama}</i>
                ))}
                <span className="rate">
                  {semua.length ? `respon ${Math.round((dijawab / semua.length) * 100)}%` : 'belum ada data'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="controls">
          <input className="search" type="search" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari perusahaan, posisi, lokasi…" aria-label="Cari lamaran" />
          <div className="chips">
            {[['aktif', 'Berjalan'], ['aksi', 'Perlu aksi'], ['lanjut', 'Lanjut proses'], ['tutup', 'Selesai'], ['semua', 'Semua']].map(([k, t]) => (
              <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {t}<span className="c">{cacah[k]}</span>
              </button>
            ))}
          </div>
          <select className="sort" value={urut} onChange={e => setUrut(e.target.value)} aria-label="Urutkan">
            <option value="lama">Paling lama menunggu</option>
            <option value="baru">Paling baru dilamar</option>
            <option value="nama">Nama perusahaan</option>
          </select>
          <a className="btn" href="/api/jobs/export.csv" download>Unduh CSV</a>
          <button className="btn btn-solid" onClick={() => setDraf({ ...KOSONG, tanggalApply: new Date().toISOString().slice(0, 10) })}>
            Tambah lamaran
          </button>
        </div>

        {galat && (
          <div className="controls">
            <div className="galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup pesan">✕</button>
            </div>
          </div>
        )}

        <div className="board">
          <div className="grid colhead">
            <span /><span>Perusahaan / Posisi</span><span>Detail</span>
            <span>Lama menunggu · skala {skala} hari</span><span>Status</span><span />
          </div>

          <div className="list">
            {tampil.map((a, i) => {
              const j = jalur(a, skala)
              const buka = terbuka.has(a.id)
              return (
                <div key={a.id} className={'row' + (buka ? ' open' : '')} style={{ '--rail': `var(--s-${a.status})` }}>
                  <div className="row-main grid">
                    <div className="idx">{String(i + 1).padStart(2, '0')}</div>

                    <button className="who" aria-expanded={buka} onClick={() => toggle(a.id)}>
                      <div className="co">
                        {a.perusahaan}
                        {a.sumber === 'cowork' && <span className="tag">cowork</span>}
                      </div>
                      <div className="role" title={a.jabatan}>{a.jabatan}</div>
                    </button>

                    <div className="meta">
                      <div>{a.jenis} · {a.tempat}</div>
                      <div className="dim">{a.lokasi || 'lokasi belum diisi'}</div>
                    </div>

                    <div className="wait">
                      <div className="track">
                        <div className={'fill' + (j.strip ? ' strip' : '')}
                          style={{ backgroundColor: j.warna, width: siap ? `${j.pct}%` : 0 }} />
                      </div>
                      <div className="wait-lbl">
                        <span>{j.kiri}</span>
                        <span className="act" style={{ color: j.warna }}>{j.kanan}</span>
                      </div>
                    </div>

                    <select className="status" value={a.status} style={{ color: `var(--s-${a.status})` }}
                      aria-label={'Status ' + a.perusahaan}
                      onClick={e => e.stopPropagation()}
                      onChange={e => gantiStatus(a, e.target.value)}>
                      {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <div className="acts">
                      <button className="ico" title="Ubah" aria-label={'Ubah ' + a.perusahaan}
                        onClick={() => setDraf({ ...KOSONG, ...a })}><IkonUbah /></button>
                      <button className="ico" title="Hapus" aria-label={'Hapus ' + a.perusahaan}
                        onClick={() => hapus(a)}><IkonHapus /></button>
                    </div>
                  </div>

                  <div className="detail">
                    {[['Tanggal apply', fmt(a.tanggalApply)], ['Dapat dari', a.referensi || '—'],
                    ['Gaji', a.gaji || '—'], ['Catatan', a.catatan || '—']].map(([t, v]) => (
                      <div key={t}>
                        <div className="dt">{t}</div>
                        <div className="dd">{v}</div>
                      </div>
                    ))}
                    {a.url && (
                      <div>
                        <div className="dt">Link lowongan</div>
                        <div className="dd">
                          <a href={a.url} target="_blank" rel="noopener noreferrer">Buka lowongan ↗</a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {tampil.length === 0 && (
            <div className="empty">
              <h3>Papan masih kosong</h3>
              <p>Belum ada lamaran yang cocok. Tambah lewat tombol di atas.</p>
            </div>
          )}
        </div>

        <footer>
          Data tersimpan di Neon Postgres.
        </footer>

        <dialog ref={dialog} onClose={() => setDraf(null)}>
          <div className="mhead">
            <h2>{draf?.id ? 'Ubah lamaran' : 'Tambah lamaran'}</h2>
            <button className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
          </div>
          {draf && (
            <form onSubmit={simpan}>
              <div className="f">
                <label htmlFor="perusahaan">Perusahaan</label>
                <input id="perusahaan" required value={draf.perusahaan} onChange={e => ubahDraf('perusahaan', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="jabatan">Posisi</label>
                <input id="jabatan" required value={draf.jabatan} onChange={e => ubahDraf('jabatan', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="lokasi">Lokasi</label>
                <input id="lokasi" placeholder="Jakarta" value={draf.lokasi} onChange={e => ubahDraf('lokasi', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="tanggalApply">Tanggal apply</label>
                <input id="tanggalApply" type="date" value={draf.tanggalApply} onChange={e => ubahDraf('tanggalApply', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="jenis">Jenis</label>
                <select id="jenis" value={draf.jenis} onChange={e => ubahDraf('jenis', e.target.value)}>
                  {JENIS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="tempat">Tempat kerja</label>
                <select id="tempat" value={draf.tempat} onChange={e => ubahDraf('tempat', e.target.value)}>
                  {TEMPAT.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="fstatus">Status</label>
                <select id="fstatus" value={draf.status} onChange={e => ubahDraf('status', e.target.value)}>
                  {STATUS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="f">
                <label htmlFor="referensi">Dapat dari</label>
                <input id="referensi" placeholder="LinkedIn" value={draf.referensi} onChange={e => ubahDraf('referensi', e.target.value)} />
              </div>
              <div className="f full">
                <label htmlFor="url">Link lowongan</label>
                <input id="url" type="url" placeholder="https://" value={draf.url} onChange={e => ubahDraf('url', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="gaji">Gaji</label>
                <input id="gaji" placeholder="Rp 8–10 jt" value={draf.gaji} onChange={e => ubahDraf('gaji', e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="catatan">Catatan</label>
                <input id="catatan" value={draf.catatan} onChange={e => ubahDraf('catatan', e.target.value)} />
              </div>
              <div className="mfoot">
                <button type="button" className="btn" onClick={() => setDraf(null)}>Batal</button>
                <button type="submit" className="btn btn-solid">Simpan</button>
              </div>
            </form>
          )}
        </dialog>
      </div>

      <style jsx global>{`
        .papan{
          --surface:#FFFFFF;
          --surface-2:#F2F5F7;
          --ink:#0D1520;
          --ink-2:#3C4A56;
          --muted:#75838E;
          --line:#D6DDE2;

          --s-Progress:#7A8894;
          --s-Applied:#33489E;
          --s-Screening:#6D3FB5;
          --s-Interview:#B45A09;
          --s-Offer:#0A6B52;
          --s-Rejected:#9C2F2F;
          --s-Ghosted:#9AA5AD;

          --w-calm:#0A6B52;
          --w-warm:#A8830B;
          --w-hot:#B45A09;
          --w-cold:#9C2F2F;
          --w-mati:#C3CBD1;

          --display:'Bricolage Grotesque',ui-sans-serif,system-ui,sans-serif;
          --body:'Instrument Sans',ui-sans-serif,system-ui,-apple-system,sans-serif;
          --mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace;

          background:#E7EBEE;color:var(--ink);
          font-family:var(--body);font-size:15px;line-height:1.45;
          min-height:calc(100vh - 44px);
          -webkit-font-smoothing:antialiased;
        }
        .papan *{box-sizing:border-box;margin:0;padding:0}
        .papan button,.papan input,.papan select,.papan textarea{font-family:inherit;font-size:inherit;color:inherit}
        .papan :focus-visible{outline:2px solid #33489E;outline-offset:2px;border-radius:3px}
        @media (prefers-reduced-motion:reduce){.papan *{transition:none!important;animation:none!important}}

        .papan .topbar{background:var(--ink);color:#E7EBEE;padding:18px 22px 17px}
        .papan .topbar-in{max-width:1240px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-end;gap:34px;flex-wrap:wrap}
        .papan h1{
          font-family:var(--display);
          font-variation-settings:'wdth' 82,'opsz' 40;
          font-weight:700;font-size:1.9rem;line-height:.98;letter-spacing:-.015em;
        }
        .papan .tagline{font-family:var(--mono);font-size:.7rem;color:#8C9AA6;margin-top:7px}
        .papan .tagline b{color:#E9A23B;font-weight:500}

        .papan .pipe{flex:1;min-width:250px;max-width:420px}
        .papan .pipe-bar{height:9px;border-radius:5px;overflow:hidden;display:flex;background:#212C38}
        .papan .pipe-bar span{display:block;transition:width .5s cubic-bezier(.22,.8,.3,1)}
        .papan .pipe-legend{font-family:var(--mono);font-size:.63rem;color:#8C9AA6;margin-top:8px;display:flex;gap:13px;flex-wrap:wrap;align-items:center}
        .papan .pipe-legend i{font-style:normal;display:inline-flex;align-items:center;gap:5px}
        .papan .pipe-legend .dot{width:7px;height:7px;border-radius:2px;display:inline-block;flex:none}
        .papan .pipe-legend .rate{margin-left:auto;color:#5F6E7B}

        .papan .controls{max-width:1240px;margin:0 auto;padding:14px 22px 0;display:flex;gap:9px;align-items:center;flex-wrap:wrap}
        .papan .search{flex:1;min-width:180px;background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:9px 12px}
        .papan .search::placeholder{color:#9AA6B0}
        .papan .chips{display:flex;gap:6px;flex-wrap:wrap}
        .papan .chip{
          background:transparent;border:1px solid var(--line);border-radius:7px;
          padding:8px 12px;font-size:.8rem;font-weight:600;color:var(--ink-2);cursor:pointer;
          transition:background .12s,border-color .12s,color .12s;
        }
        .papan .chip:hover{background:var(--surface)}
        .papan .chip[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:#FFF}
        .papan .chip .c{font-family:var(--mono);font-size:.72rem;opacity:.6;margin-left:4px}
        .papan select.sort{background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:8px 10px;font-size:.8rem;font-weight:600;cursor:pointer}
        .papan .btn{
          background:var(--surface);border:1px solid var(--line);border-radius:7px;
          padding:9px 14px;font-size:.82rem;font-weight:600;cursor:pointer;text-decoration:none;
          color:var(--ink);display:inline-flex;align-items:center;gap:6px;
        }
        .papan .btn:hover{background:var(--surface-2)}
        .papan .btn-solid{background:var(--ink);border-color:var(--ink);color:#FFF}
        .papan .btn-solid:hover{background:#1B2836}

        .papan .galat{
          flex:1;background:#FDECEC;border:1px solid #E9B8B8;color:#9C2F2F;
          border-radius:7px;padding:9px 12px;font-size:.85rem;
          display:flex;justify-content:space-between;align-items:center;gap:10px;
        }

        .papan .board{max-width:1240px;margin:0 auto;padding:16px 22px 60px}
        .papan .grid{
          display:grid;
          grid-template-columns:28px minmax(190px,1fr) 118px minmax(210px,1.4fr) 114px 58px;
          gap:14px;align-items:center;
        }
        .papan .colhead{padding:0 14px 7px;font-family:var(--mono);font-size:.6rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
        .papan .list{display:flex;flex-direction:column;gap:5px}

        .papan .row{
          background:var(--surface);border:1px solid var(--line);border-radius:9px;
          border-left:3px solid var(--rail,#7A8894);
          transition:box-shadow .12s;
        }
        .papan .row:hover{box-shadow:0 1px 0 rgba(13,21,32,.09),0 4px 14px -8px rgba(13,21,32,.28)}
        .papan .row.open{box-shadow:0 1px 0 rgba(13,21,32,.09),0 6px 20px -10px rgba(13,21,32,.34)}
        .papan .row-main{padding:11px 14px}
        .papan .idx{font-family:var(--mono);font-size:.72rem;color:#A6B1BA}
        .papan .who{text-align:left;background:none;border:none;padding:0;cursor:pointer;min-width:0}
        .papan .co{font-family:var(--display);font-variation-settings:'wdth' 92,'opsz' 16;font-weight:700;font-size:1rem;letter-spacing:-.008em;line-height:1.2}
        .papan .role{color:var(--muted);font-size:.82rem;line-height:1.3;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .papan .tag{
          display:inline-block;font-family:var(--mono);font-size:.55rem;letter-spacing:.09em;
          text-transform:uppercase;border:1px solid currentColor;border-radius:3px;
          padding:0 4px;margin-left:6px;vertical-align:2px;color:#6D3FB5;font-weight:500;
        }
        .papan .meta{font-family:var(--mono);font-size:.7rem;color:var(--ink-2);line-height:1.5;min-width:0}
        .papan .meta .dim{color:#9AA6B0}

        .papan .wait{min-width:0}
        .papan .track{height:6px;background:#E3E8EC;border-radius:3px;overflow:hidden}
        .papan .fill{height:100%;border-radius:3px;width:0;transition:width .55s cubic-bezier(.22,.8,.3,1)}
        .papan .fill.strip{background-image:repeating-linear-gradient(115deg,rgba(255,255,255,.5) 0 3px,transparent 3px 7px)}
        .papan .wait-lbl{font-family:var(--mono);font-size:.68rem;margin-top:5px;color:var(--ink-2);display:flex;justify-content:space-between;gap:10px}
        .papan .wait-lbl .act{font-weight:700;text-align:right;flex:none}

        .papan select.status{
          appearance:none;-webkit-appearance:none;
          font-family:var(--mono);font-weight:500;font-size:.66rem;letter-spacing:.09em;
          text-transform:uppercase;text-align:center;text-align-last:center;
          border:1.4px solid currentColor;border-radius:999px;background:transparent;
          padding:5px 8px;cursor:pointer;width:100%;
        }
        .papan .acts{display:flex;gap:2px;justify-content:flex-end}
        .papan .ico{
          background:none;border:none;padding:5px;border-radius:6px;cursor:pointer;
          color:#9AA6B0;display:inline-flex;align-items:center;justify-content:center;
        }
        .papan .ico:hover{background:var(--surface-2);color:var(--ink)}
        .papan .ico svg{display:block}

        .papan .detail{display:none;border-top:1px solid var(--line);padding:12px 14px 13px;background:var(--surface-2);border-radius:0 0 7px 7px}
        .papan .row.open .detail{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px 22px}
        .papan .dt{font-family:var(--mono);font-size:.58rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
        .papan .dd{font-size:.86rem;word-break:break-word}
        .papan .dd a{color:#33489E;font-weight:600}

        .papan .empty{background:var(--surface);border:1px dashed var(--line);border-radius:10px;padding:52px 24px;text-align:center;color:var(--muted)}
        .papan .empty h3{font-family:var(--display);font-variation-settings:'wdth' 84;font-weight:700;font-size:1.15rem;color:var(--ink);margin-bottom:5px}

        .papan dialog{border:none;border-radius:12px;background:var(--surface);width:min(580px,94vw);padding:0;box-shadow:0 24px 60px -16px rgba(13,21,32,.45);color:var(--ink)}
        .papan dialog::backdrop{background:rgba(13,21,32,.5)}
        .papan .mhead{background:var(--ink);color:#FFF;padding:15px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:12px 12px 0 0}
        .papan .mhead h2{font-family:var(--display);font-variation-settings:'wdth' 84;font-weight:700;font-size:1.1rem}
        .papan .mhead .ico{color:#9AA6B0}
        .papan .mhead .ico:hover{background:#25313E;color:#FFF}
        .papan form{padding:18px 20px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .papan .f{display:flex;flex-direction:column;gap:4px;min-width:0}
        .papan .f.full{grid-column:1/-1}
        .papan .f label{font-family:var(--mono);font-size:.58rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
        .papan .f input,.papan .f select,.papan .f textarea{border:1px solid var(--line);border-radius:7px;padding:8px 10px;background:var(--surface-2);font-size:.9rem}
        .papan .mfoot{grid-column:1/-1;display:flex;justify-content:flex-end;gap:9px;margin-top:4px}

        .papan footer{max-width:1240px;margin:0 auto;padding:0 22px 34px;font-family:var(--mono);font-size:.66rem;color:var(--muted);line-height:1.8}
        .papan footer code{background:var(--surface);border:1px solid var(--line);border-radius:4px;padding:1px 5px}

        @media (max-width:880px){
          .papan .colhead{display:none}
          .papan .row-main{grid-template-columns:1fr auto;grid-template-areas:"who status" "meta meta" "wait wait" "acts acts";gap:9px;padding:12px 13px}
          .papan .idx{display:none}
          .papan .who{grid-area:who}
          .papan .meta{grid-area:meta}
          .papan .wait{grid-area:wait}
          .papan .row-main > select.status{grid-area:status;width:auto}
          .papan .acts{grid-area:acts;justify-content:flex-start;border-top:1px solid var(--line);padding-top:7px;margin-top:2px}
          .papan .role{white-space:normal}
          .papan form{grid-template-columns:1fr}
          .papan h1{font-size:1.55rem}
          .papan .pipe{max-width:none}
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
