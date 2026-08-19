import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { MODULES } from '../lib/modules'
import { IkonRumah } from './icons'
import ThemeToggle from './ThemeToggle'

const LEBAR = 'sidebar-terbuka'

const IkonMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
)

const IkonKeluar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 20H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8" />
    <path d="M17 15.5 20.5 12 17 8.5M20 12H10" />
  </svg>
)

const IkonCiut = ({ ciut }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ transform: ciut ? 'rotate(180deg)' : 'none' }}>
    <path d="M14.5 6.5 9 12l5.5 5.5" />
  </svg>
)

export default function Shell({ title, children }) {
  const router = useRouter()
  const [bukaHp, setBukaHp] = useState(false)
  const [ciut, setCiut] = useState(false)

  useEffect(() => {
    try { setCiut(localStorage.getItem(LEBAR) === '0') } catch (e) {}
  }, [])

  useEffect(() => { setBukaHp(false) }, [router.pathname])

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') setBukaHp(false) }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  function ganti() {
    setCiut(v => {
      const baru = !v
      try { localStorage.setItem(LEBAR, baru ? '0' : '1') } catch (e) {}
      return baru
    })
  }

  async function keluar() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  const tautan = [
    { href: '/', label: 'Dashboard', Icon: IkonRumah },
    ...MODULES.map(({ href, label, Icon }) => ({ href, label, Icon })),
  ]

  const aktif = href =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href)

  return (
    <>
      <Head><title>{title}</title></Head>

      <div className={'kerangka' + (ciut ? ' ciut' : '') + (bukaHp ? ' buka' : '')}>
        <button className="tirai" onClick={() => setBukaHp(false)} tabIndex={-1} aria-hidden="true" />

        <aside className="sisi">
          <div className="merek">
            <span className="tanda" aria-hidden="true">PT</span>
            <span className="nama">Personal Tracker</span>
            <button className="ciutkan" onClick={ganti}
              aria-label={ciut ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
              aria-expanded={!ciut} title={ciut ? 'Lebarkan' : 'Ciutkan'}>
              <IkonCiut ciut={ciut} />
            </button>
          </div>

          <nav aria-label="Modul">
            <ul>
              {tautan.map(({ href, label, Icon }) => (
                <li key={href}>
                  {/* styled-jsx tidak menempelkan kelas scoping-nya ke komponen
                      kustom seperti Link, hanya ke elemen DOM asli. Karena itu
                      penataannya lewat `li :global(a)`, bukan lewat kelas di Link. */}
                  <Link href={href} className={aktif(href) ? 'aktif' : undefined}
                    aria-current={aktif(href) ? 'page' : undefined} title={label}>
                    <span className="ikon"><Icon /></span>
                    <span className="teks">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="kaki">
            <ThemeToggle ringkas={ciut} />
            <button className="keluar" onClick={keluar} title="Keluar" aria-label="Keluar">
              <IkonKeluar />
              <span className="teks">Keluar</span>
            </button>
          </div>
        </aside>

        <div className="kanan">
          <header className="atas-hp">
            <button className="ikon-btn" onClick={() => setBukaHp(true)}
              aria-label="Buka menu" aria-expanded={bukaHp}>
              <IkonMenu />
            </button>
            <span className="judul-hp">{title}</span>
          </header>

          <main className="isi">{children}</main>
        </div>
      </div>

      <style jsx>{`
        .kerangka { display: flex; min-height: 100vh; background: var(--bg); }

        .sisi {
          position: fixed; inset: 0 auto 0 0; z-index: 40;
          width: var(--sidebar-w);
          display: flex; flex-direction: column;
          background: var(--surface);
          border-right: var(--border-width) solid var(--border);
          padding: var(--space-3);
          transition: width var(--dur-base) var(--ease);
        }
        .ciut .sisi { width: var(--sidebar-w-collapsed); }

        .merek {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-1) var(--space-2) var(--space-6);
        }
        .tanda {
          flex: none;
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px;
          border-radius: var(--radius-sm);
          background: var(--solid); color: var(--on-solid);
          font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 700;
        }
        .nama {
          font-family: var(--font-display); font-weight: 700;
          font-size: var(--text-md); letter-spacing: var(--tracking-tight);
          white-space: nowrap; overflow: hidden;
        }
        .ciutkan {
          flex: none; margin-left: auto;
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          background: transparent; border: none;
          border-radius: var(--radius-sm); color: var(--muted);
          transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
        }
        .ciutkan:hover { background: var(--surface-2); color: var(--ink); }

        nav ul { list-style: none; display: flex; flex-direction: column; gap: 2px; }

        nav li :global(a) {
          display: flex; align-items: center; gap: var(--space-3);
          min-height: 44px; padding: 0 var(--space-3);
          border-radius: var(--radius-sm);
          color: var(--ink-2); text-decoration: none;
          font-size: var(--text-sm); font-weight: 600;
          white-space: nowrap; overflow: hidden;
          transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
        }
        nav li :global(a:hover) { background: var(--surface-2); color: var(--ink); }
        nav li :global(a.aktif) { background: var(--surface-2); color: var(--accent); }

        .ikon { flex: none; display: inline-flex; }

        .kaki {
          margin-top: auto;
          display: flex; flex-direction: column; gap: var(--space-2);
          padding-top: var(--space-4);
          border-top: var(--border-width) solid var(--border);
        }
        .keluar {
          display: flex; align-items: center; gap: var(--space-3);
          min-height: 44px; padding: 0 var(--space-3);
          background: transparent; border: none;
          border-radius: var(--radius-sm);
          color: var(--muted); font-size: var(--text-sm); font-weight: 600;
          text-align: left; white-space: nowrap; overflow: hidden;
        }
        .keluar:hover { background: var(--surface-2); color: var(--ink); }

        .ciut .nama, .ciut .teks { display: none; }
        .ciut .merek { flex-direction: column; gap: var(--space-2); padding-left: 0; padding-right: 0; }
        .ciut .ciutkan { margin-left: 0; }
        .ciut nav li :global(a) { justify-content: center; padding: 0; gap: 0; }
        .ciut .keluar { justify-content: center; padding: 0; gap: 0; }

        .kanan {
          flex: 1; min-width: 0;
          margin-left: var(--sidebar-w);
          transition: margin-left var(--dur-base) var(--ease);
        }
        .ciut .kanan { margin-left: var(--sidebar-w-collapsed); }

        .isi { max-width: var(--content-max); margin: 0 auto; }

        .atas-hp { display: none; }
        .tirai { display: none; }

        @media (max-width: 900px) {
          .sisi {
            transform: translateX(-100%);
            width: var(--sidebar-w);
            transition: transform var(--dur-base) var(--ease);
          }
          .buka .sisi { transform: translateX(0); box-shadow: var(--shadow-pop); }
          .ciut .sisi { width: var(--sidebar-w); }

          .kanan, .ciut .kanan { margin-left: 0; }
          .ciut .nama, .ciut .teks { display: inline; }
          .ciut .merek { flex-direction: row; padding-left: var(--space-2); }
          .ciut nav li :global(a), .ciut .keluar {
            justify-content: flex-start; padding: 0 var(--space-3); gap: var(--space-3);
          }
          .ciutkan { display: none; }

          .atas-hp {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-2) var(--space-3);
            background: var(--surface);
            border-bottom: var(--border-width) solid var(--border);
            position: sticky; top: 0; z-index: 20;
          }
          .ikon-btn {
            display: inline-flex; align-items: center; justify-content: center;
            width: 44px; height: 44px;
            background: transparent; border: none;
            border-radius: var(--radius-sm); color: var(--ink-2);
          }
          .ikon-btn:hover { background: var(--surface-2); color: var(--ink); }
          .judul-hp {
            font-family: var(--font-display); font-weight: 700;
            font-size: var(--text-md); letter-spacing: var(--tracking-tight);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }

          .tirai {
            display: block; position: fixed; inset: 0; z-index: 30;
            background: rgba(11, 22, 32, .5);
            border: none; padding: 0;
            opacity: 0; pointer-events: none;
            transition: opacity var(--dur-base) var(--ease);
          }
          .buka .tirai { opacity: 1; pointer-events: auto; }
        }
      `}</style>
    </>
  )
}
