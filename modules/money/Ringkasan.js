import { useState, useEffect } from 'react'
import KartuRingkasan from '../../components/KartuRingkasan'

const rp = n => 'Rp' + Math.round(n).toLocaleString('id-ID')

export default function RingkasanMoney({ modul }) {
  const [data, setData] = useState(null)
  const [galat, setGalat] = useState(false)

  useEffect(() => {
    let batal = false
    fetch('/api/money/data')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(j => { if (!batal) setData(j) })
      .catch(() => { if (!batal) setGalat(true) })
    return () => { batal = true }
  }, [])

  const s = data?.summary
  // Definisi sisa harus sama persis dengan kartu di halaman money:
  // tabungan sudah diamankan, jadi ikut dikurangi.
  const sisa = s ? s.totalIncome - s.totalVariable - s.totalFixed - s.totalSaving : 0

  return (
    <KartuRingkasan
      modul={modul}
      memuat={!data && !galat}
      galat={galat}
      labelUtama={data ? `Sisa ${data.period}` : 'Sisa'}
      utama={rp(sisa)}
      rinci={s ? [
        { label: 'Masuk', nilai: rp(s.totalIncome), warna: 'var(--money-in)' },
        { label: 'Keluar', nilai: rp(s.totalVariable + s.totalFixed), warna: 'var(--money-out)' },
        { label: 'Tabungan', nilai: rp(s.totalSaving) },
      ] : []}
    />
  )
}
