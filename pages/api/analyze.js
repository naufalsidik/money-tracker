import { withAuth } from '../../lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Rate limit per session — cegah spam yang bikin cost API membengkak
const analyzeLimiter = new Map()
const COOLDOWN_MS = 30_000 // 30 detik antar call

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Rate limit per session
  const sessionId = req.session?.user?.loginAt || 'anon'
  const last = analyzeLimiter.get(sessionId) || 0
  const elapsed = Date.now() - last
  if (elapsed < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - elapsed) / 1000)
    return res.status(429).json({ error: `Tunggu ${wait} detik sebelum analisa lagi` })
  }

  const { summary, transactions, income, period } = req.body || {}

  // Validasi dasar payload
  if (!summary || !Array.isArray(transactions) || !period) {
    return res.status(400).json({ error: 'Data tidak lengkap untuk analisa' })
  }

  analyzeLimiter.set(sessionId, Date.now())

  const categoryBreakdown = Object.entries(summary.categoryBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  - ${cat}: Rp${Number(amt).toLocaleString('id-ID')}`)
    .join('\n')

  const topTransactions = [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map(t => `  - ${t.date} | ${t.category} | ${t.description}: Rp${Number(t.amount).toLocaleString('id-ID')}`)
    .join('\n')

  const prompt = `Kamu adalah analis keuangan personal yang jujur dan to-the-point. Analisa data keuangan berikut dan berikan rekomendasi yang konkret dan actionable. Jangan basa-basi.

Periode: ${period}
Total Pemasukan: Rp${Number(summary.totalIncome || 0).toLocaleString('id-ID')}
Total Pengeluaran Variable: Rp${Number(summary.totalVariable || 0).toLocaleString('id-ID')}
Sisa setelah variable: Rp${Number((summary.totalIncome || 0) - (summary.totalVariable || 0)).toLocaleString('id-ID')}

Breakdown per kategori:
${categoryBreakdown}

10 transaksi terbesar:
${topTransactions}

Berikan analisa dalam format berikut (gunakan bahasa Indonesia):
1. **Ringkasan kondisi keuangan** (2-3 kalimat, jujur tentang kondisinya)
2. **Pengeluaran yang bisa dieliminasi atau dikurangi** (spesifik, sebutkan nominalnya)
3. **Pola pengeluaran yang perlu diperhatikan** (berdasarkan data)
4. **3 rekomendasi konkret** untuk bulan depan (dengan target nominal jika memungkinkan)
5. **Satu hal positif** dari pola keuangan ini

Jangan lebih dari 400 kata. Langsung ke intinya.`

  try {
    const message = await client.messages.create({
      // Haiku 4.5 — lebih murah & lebih cepat untuk summarization tugas seperti ini
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content?.[0]?.text || 'Tidak ada output dari AI.'
    res.json({ analysis: text })
  } catch (err) {
    console.error('[api/analyze]', err.message)
    res.status(500).json({ error: 'Gagal mengambil analisa AI' })
  }
}

export default withAuth(handler)
