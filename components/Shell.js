import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { MODULES } from '../lib/modules'

export default function Shell({ title, children }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>

      <div className="min-h-screen" style={{ background: '#0d1117', fontFamily: 'Sora, sans-serif' }}>
        <nav style={{ borderBottom: '1px solid #21262d' }}>
          <div style={{
            maxWidth: 960, margin: '0 auto', padding: '0 20px', height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {MODULES.map(m => {
                const active = router.pathname.startsWith(m.href)
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 8,
                      fontSize: 13, fontWeight: 500, textDecoration: 'none',
                      color: active ? '#e6edf3' : '#8b949e',
                      background: active ? '#161b22' : 'transparent'
                    }}
                  >
                    <span aria-hidden="true">{m.icon}</span>
                    {m.label}
                  </Link>
                )
              })}
            </div>

            <button
              onClick={handleLogout}
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 8,
                border: '1px solid #21262d', background: 'transparent',
                color: '#8b949e', cursor: 'pointer', fontFamily: 'Sora, sans-serif'
              }}
            >
              Keluar
            </button>
          </div>
        </nav>

        {children}
      </div>
    </>
  )
}
