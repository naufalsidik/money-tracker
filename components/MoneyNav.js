import Link from 'next/link'
import {
  IkonGrafik, IkonTambah, IkonDaftar, IkonUlang, IkonTarget,
} from './icons'

// Baris navigasi modul keuangan.
//
// Tiga item pertama mengubah tampilan di halaman yang sama, dua terakhir
// berpindah halaman. Bentuknya sengaja disamakan karena dari sudut pandang
// pemakai keduanya sama saja: berpindah bagian.
//
// Di halaman utama, `onTab` diisi sehingga tiga item pertama jadi tombol.
// Di sub-halaman, `onTab` kosong dan ketiganya jadi tautan ke /money dengan
// query ?tab=, supaya bisa mendarat langsung di bagian yang dituju alih-alih
// selalu jatuh ke Dashboard.
export default function MoneyNav({ tab, onTab, aktif }) {
  const item = [
    { id: 'dashboard', label: 'Dashboard', Icon: IkonGrafik },
    { id: 'add', label: 'Tambah', Icon: IkonTambah },
    { id: 'transactions', label: 'Transaksi', Icon: IkonDaftar },
    { id: 'rutin', label: 'Rutin', Icon: IkonUlang, href: '/money/rutin' },
    { id: 'target', label: 'Target', Icon: IkonTarget, href: '/money/target' },
  ]

  const sedangAktif = i => (i.href ? aktif === i.id : !aktif && tab === i.id)

  return (
    <div className="nav" role="navigation" aria-label="Bagian keuangan">
      {item.map(i => {
        const on = sedangAktif(i)
        const isi = (
          <>
            <i.Icon width={17} height={17} />
            {i.label}
          </>
        )

        if (i.href) {
          return (
            <Link key={i.id} href={i.href} className={on ? 'on' : undefined}
              aria-current={on ? 'page' : undefined}>{isi}</Link>
          )
        }

        if (!onTab) {
          return (
            <Link key={i.id} href={`/money?tab=${i.id}`}>{isi}</Link>
          )
        }

        return (
          <button key={i.id} type="button" onClick={() => onTab(i.id)}
            aria-current={on ? 'page' : undefined}
            className={on ? 'on' : undefined}>{isi}</button>
        )
      })}

      <style jsx>{`
        .nav {
          display: flex; gap: var(--space-6);
          padding: 0 var(--pad-section);
          overflow-x: auto;
        }
        .nav :global(a),
        .nav button {
          display: inline-flex; align-items: center; gap: var(--space-2);
          min-height: 44px; padding: 0 2px;
          background: none; border: none;
          border-bottom: 2px solid transparent;
          color: var(--muted); text-decoration: none;
          font-size: var(--text-sm); font-weight: 600;
          white-space: nowrap; cursor: pointer;
          transition: color var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease);
        }
        .nav :global(a:hover),
        .nav button:hover { color: var(--ink); }
        .nav :global(a.on),
        .nav button.on { color: var(--accent); border-bottom-color: var(--accent); }

        @media (max-width: 900px) {
          .nav { gap: var(--space-4); padding: 0 var(--space-4); }
        }
      `}</style>
    </div>
  )
}
