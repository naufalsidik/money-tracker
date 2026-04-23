import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { getSession } from '../lib/session'

export default function Login() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin }),
      })
      const json = await res.json()
      if (res.ok) {
        router.push('/')
      } else {
        setError(json.error || 'Login gagal.')
        setPin('')
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    }
    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>Login — Money Tracker</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: '100vh', background: '#0d1117', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Sora, sans-serif', padding: 20
      }}>
        {/* Subtle background grid */}
        <div style={{
          position: 'fixed', inset: 0, opacity: 0.03,
          backgroundImage: 'linear-gradient(#e6edf3 1px, transparent 1px), linear-gradient(90deg, #e6edf3 1px, transparent 1px)',
          backgroundSize: '40px 40px', pointerEvents: 'none'
        }} />

        <div style={{
          background: '#161b22', border: '1px solid #21262d', borderRadius: 16,
          padding: '40px 36px', width: '100%', maxWidth: 380,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)', position: 'relative'
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, background: '#f0a50015',
              border: '1px solid #f0a50040', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, margin: '0 auto 16px'
            }}>💰</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>Money Tracker</h1>
            <p style={{ fontSize: 13, color: '#8b949e' }}>Masuk untuk melanjutkan</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                Username
              </label>
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 8,
                  background: '#0d1117', border: '1px solid #30363d',
                  color: '#e6edf3', fontSize: 14, outline: 'none',
                  fontFamily: 'JetBrains Mono, monospace',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f0a500'}
                onBlur={e => e.target.style.borderColor = '#30363d'}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
                PIN
              </label>
              <input
                type="password"
                autoComplete="current-password"
                inputMode="numeric"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••••"
                required
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 8,
                  background: '#0d1117', border: '1px solid #30363d',
                  color: '#e6edf3', fontSize: 20, outline: 'none',
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.3em',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f0a500'}
                onBlur={e => e.target.style.borderColor = '#30363d'}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: '#f8514920', border: '1px solid #f8514940', color: '#f85149'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !pin}
              style={{
                marginTop: 4, padding: '12px', borderRadius: 8, border: 'none',
                background: loading || !username || !pin ? '#21262d' : '#f0a500',
                color: loading || !username || !pin ? '#8b949e' : '#0d1117',
                fontWeight: 600, fontSize: 14, cursor: loading || !username || !pin ? 'not-allowed' : 'pointer',
                fontFamily: 'Sora, sans-serif', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: '2px solid #8b949e',
                    borderTopColor: '#e6edf3', borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite'
                  }} />
                  Masuk...
                </>
              ) : 'Masuk'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#484f58', marginTop: 24 }}>
            Akses terbatas. Tidak ada registrasi publik.
          </p>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg) } }
        `}</style>
      </div>
    </>
  )
}

// Redirect to home if already logged in
export async function getServerSideProps({ req, res }) {
  const session = await getSession(req, res)
  if (session?.user?.authenticated) {
    return { redirect: { destination: '/', permanent: false } }
  }
  return { props: {} }
}
