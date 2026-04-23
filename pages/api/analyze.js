import { withAuth } from '../../lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { summary, transactions, income, period } = req.body

  const categoryBreakdown = Object.entries(summary.categoryBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `  - ${cat}: Rp${amt.toLocaleString('id-ID')}`)
    .join('\n')

  const topTransactions = [...transactions]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)
    .map(t => `  - ${t.date} | ${t.category} | ${t.description}: Rp${t.amount.toLocaleString('id-ID')}`)
    .join('\n')

  const prompt = `Kamu adalah analis keuangan personal yang jujur dan to-the-point. Analisa data keuangan berikut dan berikan rekomendasi yang konkret dan actionable. Jangan basa-basi.

Periode: ${period}
Total Pemasukan: Rp${summary.totalIncome.toLocaleString('id-ID')}
Total Pengeluaran Variable: Rp${summary.totalVariable.toLocaleString('id-ID')}
Sisa setelah variable: Rp${(summary.totalIncome - summary.totalVariable).toLocaleString('id-ID')}

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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    res.json({ analysis: message.content[0].text })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
