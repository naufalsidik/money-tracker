import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Shell from '../../components/Shell'
import { VAR_CATEGORIES } from '../../lib/constants'
import { FIXED_ITEMS } from '../../lib/validation'
import MoneyNav from '../../components/MoneyNav'

const JENIS = [
  { id: 'income', label: 'Pemasukan', warna: 'var(--money-in)' },
  { id: 'variable', label: 'Pengeluaran', warna: 'var(--money-out)' },
  { id: 'fixed', label: 'Fixed cost', warna: 'var(--money-plan)' },
]

const KOSONG = {
  jenis: 'fixed', description: '', item: FIXED_ITEMS[0],
  category: VAR_CATEGORIES[0], amount: '', hari: 20, aktif: true,
}

const rp = n => 'Rp' + Number(n || 0).toLocaleString('id-ID')

const labelJenis = j => JENIS.find(x => x.id === j)?.label || j
const warnaJenis = j => JENIS.find(x => x.id === j)?.warna || 'var(--muted)'

// Periode berjalan dari tanggal 20 sampai 19. Tanggal 20 ke atas berarti
// awal periode, di bawahnya berarti bulan berikutnya — perlu dijelaskan
// karena angka "5" terasa seperti awal padahal justru menjelang akhir.
const jelaskanHari = h =>
  h >= 20 ? `tanggal ${h}, awal periode` : `tanggal ${h}, bulan berikutnya`

async function api(path, opsi) {
  const r = await fetch(path, opsi)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || 'Gagal menyimpan')
  }
  return r.json()
}

export default function Berulang() {
  const [daftar, setDaftar] = useState(null)
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')

  const muat = useCallback(async () => {
    try { setDaftar(await api('/api/money/recurring')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  async function simpan(e) {
    e.preventDefault()
    const { id, ...isi } = draf
    try {
      await api('/api/money/recurring' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...isi, amount: Number(isi.amount), hari: Number(isi.hari) }),
      })
      setDraf(null)
      muat()
    } catch (err) { setGalat(err.message) }
  }

  async function hapus(r) {
    const nama = r.jenis === 'fixed' ? r.item : r.description
    if (!confirm(`Hapus template "${nama}"? Baris yang sudah dibuat di periode lalu tetap ada.`)) return
    try {
      await api('/api/money/recurring/' + r.id, { method: 'DELETE' })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  async function toggleAktif(r) {
    try {
      await api('/api/money/recurring/' + r.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...r, aktif: !r.aktif }),
      })
      muat()
    } catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setDraf(d => ({ ...d, [k]: v }))

  return (
    <Shell title="Rutin">
      <div className="hal">
        <header className="atas">
          <div>
            <h1>Rutin</h1>
            <p className="sub">
              Template ini dimasukkan otomatis setiap periode baru dibuka.
              Nilai fixed cost hanya diisi bila masih kosong, jadi suntingan
              manual Anda tidak tertimpa.
            </p>
          </div>
          <div className="aksi">
            <button className="btn solid" onClick={() => setDraf({ ...KOSONG })}>
              Tambah template
            </button>
          </div>
        </header>

        <MoneyNav aktif="rutin" />

        {galat && (
          <div className="galat" role="alert">
            {galat}
            <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
          </div>
        )}

        {daftar === null && <div className="rangka" aria-hidden="true" />}

        {daftar && daftar.length === 0 && (
          <div className="kosong">
            <h3>Belum ada template</h3>
            <p>Tambahkan gaji, kosan, atau langganan yang berulang tiap bulan.</p>
          </div>
        )}

        {daftar && daftar.length > 0 && (
          <ul className="daftar">
            {daftar.map(r => (
              <li key={r.id} className={'baris' + (r.aktif ? '' : ' mati')}
                style={{ '--rail': warnaJenis(r.jenis) }}>
                <div className="isi">
                  <p className="nama">{r.jenis === 'fixed' ? r.item : r.description}</p>
                  <p className="meta">
                    {labelJenis(r.jenis)}
                    {r.category ? ` · ${r.category}` : ''}
                    {' · '}{jelaskanHari(r.hari)}
                    {r.aktif ? '' : ' · nonaktif'}
                  </p>
                </div>
                <p className="nominal num">{rp(r.amount)}</p>
                <div className="tombol">
                  <button className="ico" onClick={() => toggleAktif(r)}
                    title={r.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    aria-label={r.aktif ? 'Nonaktifkan' : 'Aktifkan'}>
                    {r.aktif ? '❙❙' : '▶'}
                  </button>
                  <button className="ico" onClick={() => setDraf({ ...KOSONG, ...r })}
                    aria-label="Ubah">Ubah</button>
                  <button className="ico bahaya" onClick={() => hapus(r)}
                    aria-label="Hapus">Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {draf && (
          <div className="tirai" onClick={e => { if (e.target === e.currentTarget) setDraf(null) }}>
            <form className="modal" onSubmit={simpan}>
              <div className="mhead">
                <h2>{draf.id ? 'Ubah template' : 'Tambah template'}</h2>
                <button type="button" className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
              </div>

              <div className="f">
                <label htmlFor="jenis">Jenis</label>
                <select id="jenis" value={draf.jenis} onChange={e => ubah('jenis', e.target.value)}>
                  {JENIS.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                </select>
              </div>

              {draf.jenis === 'fixed' ? (
                <div className="f">
                  <label htmlFor="item">Item</label>
                  <select id="item" value={draf.item} onChange={e => ubah('item', e.target.value)}>
                    {FIXED_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              ) : (
                <div className="f">
                  <label htmlFor="description">Deskripsi</label>
                  <input id="description" required value={draf.description}
                    placeholder={draf.jenis === 'income' ? 'Gaji' : 'Langganan'}
                    onChange={e => ubah('description', e.target.value)} />
                </div>
              )}

              {draf.jenis === 'variable' && (
                <div className="f">
                  <label htmlFor="category">Kategori</label>
                  <select id="category" value={draf.category} onChange={e => ubah('category', e.target.value)}>
                    {VAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="f">
                <label htmlFor="amount">Jumlah</label>
                <input id="amount" type="number" min="0" required value={draf.amount}
                  onChange={e => ubah('amount', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="hari">Tanggal</label>
                <input id="hari" type="number" min="1" max="31" required value={draf.hari}
                  aria-describedby="hari-bantu"
                  onChange={e => ubah('hari', e.target.value)} />
                <span className="bantu" id="hari-bantu">{jelaskanHari(Number(draf.hari) || 20)}</span>
              </div>

              <div className="mfoot">
                <button type="button" className="btn" onClick={() => setDraf(null)}>Batal</button>
                <button type="submit" className="btn solid">Simpan</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style jsx>{`
        .hal { padding: var(--space-6) var(--pad-section) var(--space-12); }

        .atas {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: var(--space-6); flex-wrap: wrap; margin-bottom: var(--space-6);
        }
        h1 {
          font-family: var(--font-display); font-weight: 800;
          font-size: var(--text-2xl); color: var(--ink);
          letter-spacing: var(--tracking-tight);
        }
        .sub {
          font-size: var(--text-sm); color: var(--muted);
          margin-top: var(--space-2); max-width: 62ch;
        }
        .aksi { display: flex; gap: var(--space-2); flex-wrap: wrap; }

        .hal :global(.btn) {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 44px; padding: 0 var(--space-4);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface); color: var(--ink);
          font-size: var(--text-sm); font-weight: 600;
          text-decoration: none; cursor: pointer;
        }
        .hal :global(.btn:hover) { background: var(--surface-2); }
        .hal :global(.btn.solid) {
          background: var(--solid); border-color: var(--solid); color: var(--on-solid);
        }

        .galat {
          background: var(--surface); border: var(--border-width) solid var(--danger);
          color: var(--danger); border-radius: var(--radius-sm);
          padding: var(--space-3); font-size: var(--text-sm);
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: var(--space-4);
        }

        .rangka { height: 120px; border-radius: var(--radius-md); background: var(--surface-2); }

        .kosong {
          background: var(--surface); border: var(--border-width) dashed var(--border);
          border-radius: var(--radius-md); padding: var(--space-12) var(--space-6);
          text-align: center; color: var(--muted);
        }
        .kosong h3 {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink); margin-bottom: var(--space-1);
        }

        .daftar { list-style: none; display: flex; flex-direction: column; gap: var(--space-1); }
        .baris {
          display: flex; align-items: center; gap: var(--space-4);
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-left: 3px solid var(--rail);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
        }
        .baris.mati { opacity: .5; }
        .isi { flex: 1; min-width: 0; }
        .nama { font-weight: 600; color: var(--ink); }
        .meta { font-size: var(--text-xs); color: var(--muted); margin-top: 2px; }
        .nominal { font-size: var(--text-md); color: var(--ink-2); white-space: nowrap; }
        .tombol { display: flex; gap: var(--space-1); }

        .ico {
          min-height: 36px; padding: 0 var(--space-2);
          background: none; border: none; border-radius: var(--radius-sm);
          color: var(--muted); font-size: var(--text-xs); font-weight: 600; cursor: pointer;
        }
        .ico:hover { background: var(--surface-2); color: var(--ink); }
        .ico.bahaya:hover { color: var(--danger); }

        .tirai {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(11, 22, 32, .55);
          display: flex; align-items: center; justify-content: center;
          padding: var(--space-4);
        }
        .modal {
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-pop);
          width: min(460px, 100%);
          padding: 0 var(--space-5) var(--space-5);
          display: flex; flex-direction: column; gap: var(--space-3);
          max-height: 90vh; overflow: auto;
        }
        .mhead {
          display: flex; justify-content: space-between; align-items: center;
          margin: 0 calc(var(--space-5) * -1) var(--space-2);
          padding: var(--space-4) var(--space-5);
          background: var(--surface-2);
          border-bottom: var(--border-width) solid var(--border);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }
        .mhead h2 {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink);
        }

        .f { display: flex; flex-direction: column; gap: var(--space-1); }
        .f label {
          font-size: var(--text-2xs); letter-spacing: var(--tracking-label);
          text-transform: uppercase; color: var(--muted);
        }
        .bantu { font-size: var(--text-xs); color: var(--muted); }
        .mfoot { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }

        @media (max-width: 900px) {
          .hal { padding: var(--space-5) var(--space-4) var(--space-10); }
          .baris { flex-wrap: wrap; }
          .nominal { order: 3; }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
