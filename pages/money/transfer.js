import { useState, useEffect, useCallback } from 'react'
import Shell from '../../components/Shell'
import MoneyNav from '../../components/MoneyNav'

const KOSONG = {
  tanggal: new Date().toISOString().slice(0, 10),
  dariId: '', keId: '', amount: '', fee: '', catatan: '',
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

export default function Transfer() {
  const [data, setData] = useState(null)
  const [form, setForm] = useState({ ...KOSONG })
  const [kirim, setKirim] = useState(false)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')

  const muat = useCallback(async () => {
    try { setData(await api('/api/money/wallets')) }
    catch (e) { setGalat(e.message) }
  }, [])

  useEffect(() => { muat() }, [muat])

  const dompet = (data?.dompet || []).filter(w => w.aktif)
  const asal = dompet.find(w => String(w.id) === String(form.dariId))

  const jumlah = Number(form.amount) || 0
  const biaya = Number(form.fee) || 0
  const totalKeluar = jumlah + biaya
  const kurang = asal && totalKeluar > asal.saldo

  async function simpan(e) {
    e.preventDefault()
    setKirim(true)
    try {
      await api('/api/money/wallets/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: jumlah, fee: biaya }),
      })
      setForm({ ...KOSONG, dariId: form.dariId })
      setPesan('Transfer tercatat.')
      setTimeout(() => setPesan(''), 4000)
      muat()
    } catch (err) { setGalat(err.message) }
    setKirim(false)
  }

  async function hapus(t) {
    const tambahan = t.fee > 0 ? ` Biaya admin ${rp(t.fee)} ikut terhapus.` : ''
    if (!confirm(`Hapus transfer ${rp(t.amount)} dari ${t.dari} ke ${t.ke}?${tambahan}`)) return
    try { await api('/api/money/wallets/transfer?id=' + t.id, { method: 'DELETE' }); muat() }
    catch (e) { setGalat(e.message) }
  }

  const ubah = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Shell title="Transfer">
      <div className="hal">
        <header className="atas">
          <h1>Transfer</h1>
          <p className="sub">
            Memindahkan uang antar dompet. Bukan pemasukan, bukan pengeluaran —
            total keuangan Anda tidak berubah. Biaya adminnya yang dicatat
            sebagai pengeluaran.
          </p>
        </header>

        <MoneyNav aktif="transfer" />

        <div className="badan">
          {galat && (
            <div className="kabar galat" role="alert">
              {galat}
              <button className="ico" onClick={() => setGalat('')} aria-label="Tutup">✕</button>
            </div>
          )}
          {pesan && <div className="kabar sukses" role="status">{pesan}</div>}

          {data === null && <div className="rangka" aria-hidden="true" />}

          {data && dompet.length < 2 && (
            <div className="kosong">
              <h3>Butuh minimal dua dompet</h3>
              <p>Tambahkan dompet lain di bagian Dompet sebelum bisa transfer.</p>
            </div>
          )}

          {dompet.length >= 2 && (
            <form className="kartu form" onSubmit={simpan}>
              <div className="baris">
                <div className="f">
                  <label htmlFor="tanggal">Tanggal</label>
                  <input id="tanggal" type="date" required value={form.tanggal}
                    onChange={e => ubah('tanggal', e.target.value)} />
                </div>

                <div className="f">
                  <label htmlFor="dariId">Dari</label>
                  <select id="dariId" required value={form.dariId}
                    onChange={e => ubah('dariId', e.target.value)}>
                    <option value="">Pilih dompet</option>
                    {dompet.map(w => (
                      <option key={w.id} value={w.id}>{w.nama} · {rp(w.saldo)}</option>
                    ))}
                  </select>
                </div>

                <div className="f">
                  <label htmlFor="keId">Ke</label>
                  <select id="keId" required value={form.keId}
                    onChange={e => ubah('keId', e.target.value)}>
                    <option value="">Pilih dompet</option>
                    {dompet.filter(w => String(w.id) !== String(form.dariId))
                      .map(w => <option key={w.id} value={w.id}>{w.nama}</option>)}
                  </select>
                </div>
              </div>

              <div className="baris">
                <div className="f">
                  <label htmlFor="amount">Jumlah transfer</label>
                  <input id="amount" type="number" min="1" required value={form.amount}
                    onChange={e => ubah('amount', e.target.value)} />
                </div>

                <div className="f">
                  <label htmlFor="fee">Biaya admin</label>
                  <input id="fee" type="number" min="0" value={form.fee}
                    placeholder="0" aria-describedby="fee-bantu"
                    onChange={e => ubah('fee', e.target.value)} />
                  <span className="bantu" id="fee-bantu">
                    Dicatat sebagai pengeluaran kategori Biaya Admin. Kosongkan bila gratis.
                  </span>
                </div>

                <div className="f">
                  <label htmlFor="catatan">Catatan</label>
                  <input id="catatan" maxLength={200} value={form.catatan}
                    onChange={e => ubah('catatan', e.target.value)} />
                </div>
              </div>

              {jumlah > 0 && form.dariId && (
                <div className={'ringkas' + (kurang ? ' waspada' : '')}>
                  <p>
                    <b>{asal?.nama}</b> berkurang <b className="num">{rp(totalKeluar)}</b>
                    {biaya > 0 && <> ({rp(jumlah)} + admin {rp(biaya)})</>}
                  </p>
                  {kurang && (
                    <p className="peringatan">
                      Saldo tercatat {rp(asal.saldo)}, kurang {rp(totalKeluar - asal.saldo)}.
                      Tetap bisa disimpan — saldo bisa saja belum sinkron dengan mutasi asli.
                    </p>
                  )}
                </div>
              )}

              <div className="kaki">
                <button type="submit" className="btn solid" disabled={kirim}>
                  {kirim ? 'Menyimpan…' : 'Catat transfer'}
                </button>
              </div>
            </form>
          )}

          {data?.transfer?.length > 0 && (
            <section className="riwayat">
              <h2>Riwayat</h2>
              <ul>
                {data.transfer.map(t => (
                  <li key={t.id}>
                    <span className="tgl">{fmt(t.tanggal)}</span>
                    <span className="rute">
                      {t.dari} → {t.ke}
                      {t.catatan && <span className="catatan"> · {t.catatan}</span>}
                    </span>
                    <span className="nom num">
                      {rp(t.amount)}
                      {t.fee > 0 && <span className="fee"> + {rp(t.fee)}</span>}
                    </span>
                    <button className="ico bahaya" onClick={() => hapus(t)}>Hapus</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <style jsx>{`
        .hal { padding: var(--space-6) 0 var(--space-12); }
        .atas { padding: 0 var(--pad-section) var(--space-5); }
        h1 {
          font-family: var(--font-display); font-weight: 800;
          font-size: var(--text-2xl); color: var(--ink);
          letter-spacing: var(--tracking-tight);
        }
        .sub { font-size: var(--text-sm); color: var(--muted); margin-top: var(--space-2); max-width: 66ch; }
        .badan { padding: var(--space-5) var(--pad-section) 0; }

        .hal :global(.btn) {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 44px; padding: 0 var(--space-5);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          background: var(--surface); color: var(--ink);
          font-size: var(--text-sm); font-weight: 600; cursor: pointer;
        }
        .hal :global(.btn.solid) { background: var(--solid); border-color: var(--solid); color: var(--on-solid); }
        .hal :global(.btn:disabled) { opacity: .55; cursor: not-allowed; }

        .kabar {
          border-radius: var(--radius-sm); padding: var(--space-3);
          font-size: var(--text-sm); margin-bottom: var(--space-4);
          display: flex; justify-content: space-between; align-items: center;
          background: var(--surface); border: var(--border-width) solid var(--border);
        }
        .kabar.galat { border-color: var(--danger); color: var(--danger); }
        .kabar.sukses { border-color: var(--ok); color: var(--ok); }
        .rangka { height: 200px; border-radius: var(--radius-md); background: var(--surface-2); }

        .kosong {
          background: var(--surface); border: var(--border-width) dashed var(--border);
          border-radius: var(--radius-md); padding: var(--space-12) var(--space-6);
          text-align: center; color: var(--muted);
        }
        .kosong h3 {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-lg); color: var(--ink); margin-bottom: var(--space-1);
        }

        .kartu {
          background: var(--surface); border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md); padding: var(--pad-card);
        }
        .form { display: flex; flex-direction: column; gap: var(--space-4); }
        .baris {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--space-4);
        }
        .f { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
        .f label {
          font-size: var(--text-2xs); letter-spacing: var(--tracking-label);
          text-transform: uppercase; color: var(--muted);
        }
        .bantu { font-size: var(--text-xs); color: var(--muted); }

        .ringkas {
          background: var(--surface-2); border-radius: var(--radius-sm);
          padding: var(--space-3); font-size: var(--text-sm); color: var(--ink-2);
        }
        .ringkas.waspada { border: var(--border-width) solid var(--warn); }
        .peringatan { color: var(--warn); font-size: var(--text-xs); margin-top: var(--space-2); }

        .kaki { display: flex; justify-content: flex-end; }

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
        .rute { flex: 1; color: var(--ink-2); min-width: 0; }
        .catatan { color: var(--muted); }
        .nom { color: var(--ink); white-space: nowrap; }
        .fee { color: var(--warn); }

        .ico {
          min-height: 36px; padding: 0 var(--space-2);
          background: none; border: none; border-radius: var(--radius-sm);
          color: var(--muted); font-size: var(--text-xs); font-weight: 600; cursor: pointer;
        }
        .ico:hover { background: var(--surface-2); color: var(--ink); }
        .ico.bahaya:hover { color: var(--danger); }

        @media (max-width: 900px) {
          .atas { padding: 0 var(--space-4) var(--space-4); }
          .badan { padding: var(--space-4) var(--space-4) 0; }
          .riwayat li { flex-wrap: wrap; }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../../lib/auth'
export const getServerSideProps = requireAuth()
