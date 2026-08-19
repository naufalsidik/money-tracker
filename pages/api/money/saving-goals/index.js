import { withAuth } from '../../../../lib/auth'
import { sql, toNumber } from '../../../../lib/db'

const keJson = r => ({
  id: Number(r.id),
  component: r.component,
  target: toNumber(r.target),
  terkumpul: toNumber(r.terkumpul),
  deadline: r.deadline,
  catatan: r.catatan,
  aktif: r.aktif,
})

function validasi(d) {
  const e = []
  if (!d || typeof d !== 'object') return ['Data tidak valid']
  const nama = String(d.component || '').trim()
  if (!nama || nama.length > 60) e.push('Nama wajib diisi (max 60 karakter)')
  const t = Number(d.target)
  if (!Number.isFinite(t) || t <= 0 || t > 100_000_000_000) e.push('Target harus angka positif')
  if (d.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(d.deadline)) e.push('Format deadline tidak valid')
  if (d.catatan && String(d.catatan).length > 200) e.push('Catatan maksimal 200 karakter')
  return e
}

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Progres dihitung dari seluruh periode, bukan periode berjalan.
      // Tabungan itu akumulatif; membatasinya ke satu bulan akan selalu
      // menampilkan progres nyaris nol.
      const baris = await sql`
        select g.id, g.component, g.target, g.catatan, g.aktif,
               to_char(g.deadline, 'YYYY-MM-DD') as deadline,
               coalesce(s.terkumpul, 0) as terkumpul
        from saving_goals g
        left join (
          select component, sum(amount)::bigint as terkumpul
          from savings
          group by component
        ) s on s.component = g.component
        order by g.aktif desc, g.deadline nulls last, g.id
      `
      // Komponen yang sudah pernah dipakai tapi belum punya target.
      // Dipakai UI sebagai saran, supaya nama tidak salah ketik dan
      // riwayat lama langsung terhubung.
      const bebas = await sql`
        select distinct s.component
        from savings s
        left join saving_goals g on g.component = s.component
        where g.id is null
        order by s.component
      `
      return res.json({
        goals: baris.map(keJson),
        komponenTersedia: bebas.map(b => b.component),
      })
    }

    if (req.method === 'POST') {
      const galat = validasi(req.body)
      if (galat.length) return res.status(400).json({ error: galat.join(', ') })
      const d = req.body

      const ada = await sql`
        select id from saving_goals where lower(component) = lower(${String(d.component).trim()})
      `
      if (ada.length) return res.status(400).json({ error: 'Nama target sudah dipakai' })

      const baris = await sql`
        insert into saving_goals (component, target, deadline, catatan, aktif)
        values (
          ${String(d.component).trim()},
          ${Math.round(Number(d.target))},
          ${d.deadline || null},
          ${String(d.catatan || '').trim()},
          ${d.aktif !== false}
        )
        returning *
      `
      return res.status(201).json({ ...keJson(baris[0]), terkumpul: 0 })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method tidak diizinkan' })
  } catch (e) {
    console.error('[saving-goals]', e.message)
    return res.status(500).json({ error: 'Gagal memproses data' })
  }
}

export default withAuth(handler)
