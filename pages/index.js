import Shell from '../components/Shell'
import { MODULES } from '../lib/modules'

const SAPAAN = () => {
  const j = new Date().getHours()
  if (j < 11) return 'Selamat pagi'
  if (j < 15) return 'Selamat siang'
  if (j < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export default function Home() {
  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <Shell title="Dashboard">
      <div className="beranda">
        <header className="kepala">
          <p className="tanggal mono">{tanggal}</p>
          <h1>{SAPAAN()}</h1>
        </header>

        {/* Home tidak tahu apa isi tiap modul. Dia hanya merender
            komponen Ringkasan yang didaftarkan di lib/modules.js. */}
        <div className="tumpuk">
          {MODULES.map(m => <m.Ringkasan key={m.id} modul={m} />)}
        </div>
      </div>

      <style jsx>{`
        .beranda { padding: var(--space-8) var(--pad-section) var(--space-12); }
        .kepala { margin-bottom: var(--space-8); }
        .tanggal {
          font-size: var(--text-2xs);
          letter-spacing: var(--tracking-label);
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: var(--space-2);
        }
        h1 { font-size: var(--text-2xl); color: var(--ink); }

        /* Ditumpuk atas-bawah, satu kolom. Kartu memakai lebar penuh
           supaya isinya tidak menggantung di kiri. */
        .tumpuk {
          display: flex; flex-direction: column;
          gap: var(--gap-grid);
        }

        @media (max-width: 900px) {
          .beranda { padding: var(--space-5) var(--space-4) var(--space-10); }
        }
      `}</style>
    </Shell>
  )
}

import { requireAuth } from '../lib/auth'
export const getServerSideProps = requireAuth()
