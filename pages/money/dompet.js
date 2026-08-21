import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import MoneyNav from '../../components/MoneyNav'

const KOSONG_DOMPET = {
  nama: '', jenis: 'Rekening', saldoAwal: '',
  tanggalAwal: new Date().toISOString().slice(0, 10),
  catatan: '', aktif: true,
}

const rp = n => 'Rp' + Number(n || 0).toLocaleString('id-ID')

const fmt = d => {
  if (!d) return '—'
  const t = new Date(d + 'T00:00:00')
  return isNaN(t) ? d : t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function api(path, opsi) {
  const r = await fetch(path, opsi)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || 'Gagal menyimpan')
  }
  return r.json()
}

export default function Dompet() {
  const [data, setData] = useState(null)
  const [draf, setDraf] = useState(null)
  const [galat, setGalat] = useState('')

  const muat = useCallback(async () => {
    try { setData(await api('/api/money/wallets')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  async function simpanDompet(e) {
    e.preventDefault()
    const { id, saldo, ...isi } = draf
    try {
      await api('/api/money/wallets' + (id ? '/' + id : ''), {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...isi, saldoAwal: Number(isi.saldoAwal) }),
      })
      setDraf(null); muat()
    } catch (err) { setGalat(err.message) }
  }

  async function hapusDompet(w) {
    if (!confirm(`Hapus dompet "${w.nama}"? Transaksi yang menunjuk dompet ini kehilangan penandanya, tapi nominalnya tetap ada.`)) return
    try { await api('/api/money/wallets/' + w.id, { method: 'DELETE' }); muat() }
    catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setDraf(d => ({ ...d, [k]: v }))

  const dompet = data?.dompet || []
  const aktif = dompet.filter(w => w.aktif)

  return (
    <Shell title="Dompet">
      <div className="hal">
        <header className="atas">
          <div>
            <h1>Dompet</h1>
            <p className="sub">
              Saldo dihitung dari saldo awal ditambah transaksi setelah tanggal
              awal, tidak pernah disimpan langsung. Tabungan tidak mengurangi
              saldo — uangnya masih ada, hanya ditandai jangan dipakai.
            </p>
          </div>
          <div className="aksi">
            <button className="btn solid" onClick={() => setDraf({ ...KOSONG_DOMPET })}>
              Tambah dompet
            </button>
          </div>
        </header>

        <MoneyNav aktif="dompet" />

        <div className="badan">
          {galat && (
            <div className="galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
            </div>
          )}

          {data === null && <div className="rangka" aria-hidden="true" />}

          {data && dompet.length === 0 && (
            <div className="kosong">
              <h3>Belum ada dompet</h3>
              <p>Tambahkan rekening, e-wallet, atau uang tunai beserta saldonya hari ini.</p>
            </div>
          )}

          {dompet.length > 0 && (
            <>
              <div className="total">
                <p className="label">Total saldo</p>
                <p className="num besar">{rp(data.total)}</p>
                <p className="label kecil">{aktif.length} dompet aktif</p>
              </div>

              <ul className="daftar">
                {dompet.map(w => (
                  <li key={w.id} className={'kartu' + (w.aktif ? '' : ' mati')}>
                    <div className="kepala">
                      <div>
                        <p className="nama">{w.nama}</p>
                        <p className="jenis">{w.jenis}{w.aktif ? '' : ' · nonaktif'}</p>
                      </div>
                      <div className="tombol">
                        <button className="ico" onClick={() => setDraf({ ...KOSONG_DOMPET, ...w })}>Ubah</button>
                        <button className="ico bahaya" onClick={() => hapusDompet(w)}>Hapus</button>
                      </div>
                    </div>

                    <p className="num saldo" style={{ color: w.saldo < 0 ? 'var(--danger)' : 'var(--ink)' }}>
                      {rp(w.saldo)}
                    </p>

                    <dl className="rinci">
                      <div>
                        <dt>Saldo awal</dt>
                        <dd className="num">{rp(w.saldoAwal)}</dd>
                      </div>
                      <div>
                        <dt>Sejak</dt>
                        <dd>{fmt(w.tanggalAwal)}</dd>
                      </div>
                      {w.catatan && (
                        <div>
                          <dt>Catatan</dt>
                          <dd>{w.catatan}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {draf && (
          <div className="tirai" onClick={e => { if (e.target === e.currentTarget) setDraf(null) }}>
            <form className="modal" onSubmit={simpanDompet}>
              <div className="mhead">
                <h2>{draf.id ? 'Ubah dompet' : 'Tambah dompet'}</h2>
                <button type="button" className="ico" onClick={() => setDraf(null)} aria-label="Tutup">✕</button>
              </div>

              <div className="f">
                <label htmlFor="nama">Nama</label>
                <input id="nama" required maxLength={60} value={draf.nama}
                  placeholder="BCA, GoPay, Dompet"
                  onChange={e => ubah('nama', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="jenis">Jenis</label>
                <select id="jenis" value={draf.jenis} onChange={e => ubah('jenis', e.target.value)}>
                  {(data?.jenis || ['Rekening']).map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>

              <div className="f">
                <label htmlFor="saldoAwal">Saldo awal</label>
                <input id="saldoAwal" type="number" required value={draf.saldoAwal}
                  onChange={e => ubah('saldoAwal', e.target.value)} />
              </div>

              <div className="f">
                <label htmlFor="tanggalAwal">Saldo per tanggal</label>
                <input id="tanggalAwal" type="date" required value={draf.tanggalAwal}
                  aria-describedby="tgl-bantu"
                  onChange={e => ubah('tanggalAwal', e.target.value)} />
                <span className="bantu" id="tgl-bantu">
                  Transaksi sebelum tanggal ini tidak dihitung, karena sudah tercakup
                  di saldo awal.
                </span>
              </div>

              <div className="f">
                <label htmlFor="catatan">Catatan</label>
                <input id="catatan" maxLength={200} value={draf.catatan}
                  onChange={e => ubah('catatan', e.target.value)} />
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
        .hal { padding: var(--space-6) 0 var(--space-12); }
        .atas {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: var(--space-6); flex-wrap: wrap;
          padding: 0 var(--pad-section) var(--space-5);
        }
        h1 {
          font-family: var(--font-display); font-weight: 800;
          font-size: var(--text-2xl); color: var(--ink);
          letter-spacing: var(--tracking-tight);
        }
        .sub { font-size: var(--text-sm); color: var(--muted); margin-top: var(--space-2); max-width: 66ch; }
        .aksi { display: flex; gap: var(--space-2); flex-wrap: wrap; }
        .badan { padding: var(--space-5) var(--pad-section) 0; }

        .hal :global(.btn) {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 44px; padding: 0 var(--space-4);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface); color: var(--ink);
          font-size: var(--text-sm); font-weight: 600; cursor: pointer;
        }
        .hal :global(.btn:hover) { background: var(--surface-2); }
        .hal :global(.btn.solid) { background: var(--solid); border-color: var(--solid); color: var(--on-solid); }

        .galat {
          background: var(--surface); border: var(--border-width) solid var(--danger);
          color: var(--danger); border-radius: var(--radius-sm);
          padding: var(--space-3); font-size: var(--text-sm);
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: var(--space-4);
        }
        .rangka { height: 160px; border-radius: var(--radius-md); background: var(--surface-2); }

        .kosong {
          background: var(--surface); border: var(--border-width) dashed var(--border);
          border-radius: var(--radius-md); padding: var(--space-12) var(--space-6);
          text-align: center; color: var(--muted);
        }
        .kosong h3 {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink); margin-bottom: var(--space-1);
        }

        .total {
          background: var(--surface); border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md); padding: var(--pad-card);
          margin-bottom: var(--gap-grid);
        }
        .label {
          font-size: var(--text-2xs); letter-spacing: var(--tracking-label);
          text-transform: uppercase; color: var(--muted);
        }
        .besar {
          font-size: var(--text-2xl); font-weight: 500; color: var(--ink);
          line-height: var(--leading-tight); letter-spacing: var(--tracking-tight);
          margin: var(--space-1) 0;
        }
        .kecil { text-transform: none; letter-spacing: 0; font-size: var(--text-xs); }

        .daftar {
          list-style: none; display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: var(--gap-grid);
        }
        .kartu {
          background: var(--surface); border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md); padding: var(--pad-card);
        }
        .kartu.mati { opacity: .55; }
        .kepala { display: flex; justify-content: space-between; gap: var(--space-3); }
        .nama {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink);
          letter-spacing: var(--tracking-tight);
        }
        .jenis { font-size: var(--text-xs); color: var(--muted); margin-top: 2px; }
        .tombol { display: flex; gap: var(--space-1); flex: none; }
        .saldo {
          font-size: var(--text-xl); font-weight: 500;
          margin: var(--space-4) 0 var(--space-1);
          letter-spacing: var(--tracking-tight);
        }
        .rinci {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: var(--space-3) var(--space-4);
          margin-top: var(--space-3); padding-top: var(--space-3);
          border-top: var(--border-width) solid var(--border);
        }
        .rinci dt {
          font-size: var(--text-2xs); letter-spacing: var(--tracking-label);
          text-transform: uppercase; color: var(--muted);
        }
        .rinci dd { font-size: var(--text-sm); color: var(--ink-2); margin-top: 2px; }

        .riwayat { margin-top: var(--space-8); }
        .riwayat h2 {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink); margin-bottom: var(--space-3);
        }
        .riwayat ul { list-style: none; display: flex; flex-direction: column; gap: var(--space-1); }
        .riwayat li {
          display: flex; align-items: center; gap: var(--space-4);
          background: var(--surface); border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm); padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
        }
        .tgl { color: var(--muted); white-space: nowrap; }
        .rute { flex: 1; color: var(--ink-2); }
        .nom { color: var(--ink); white-space: nowrap; }

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
          display: flex; align-items: center; justify-content: center; padding: var(--space-4);
        }
        .modal {
          background: var(--surface); border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-pop);
          width: min(460px, 100%); padding: 0 var(--space-5) var(--space-5);
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
          .atas { padding: 0 var(--space-4) var(--space-4); }
          .badan { padding: var(--space-4) var(--space-4) 0; }
          .daftar { grid-template-columns: 1fr; }
          .riwayat li { flex-wrap: wrap; }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
