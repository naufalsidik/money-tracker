import { useTema } from '../lib/theme'

// Ikon garis, bukan emoji. Emoji berubah bentuk antar sistem operasi
// dan tidak mengikuti warna teks.
const Matahari = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
  </svg>
)

const Bulan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" />
  </svg>
)

export default function ThemeToggle({ ringkas = false }) {
  const { tema, ganti } = useTema()
  const gelap = tema === 'dark'
  const label = gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'

  return (
    <button
      type="button"
      onClick={ganti}
      className="theme-toggle"
      title={label}
      aria-label={label}
      aria-pressed={gelap}
    >
      {gelap ? <Matahari /> : <Bulan />}
      {!ringkas && <span>{gelap ? 'Terang' : 'Gelap'}</span>}

      <style jsx>{`
        .theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          min-height: 44px;
          padding: 0 var(--space-3);
          background: transparent;
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--ink-2);
          font-size: var(--text-sm);
          font-weight: 600;
          transition: background var(--dur-fast) var(--ease),
                      color var(--dur-fast) var(--ease),
                      border-color var(--dur-fast) var(--ease);
        }
        .theme-toggle:hover {
          background: var(--surface-2);
          border-color: var(--border-strong);
          color: var(--ink);
        }
      `}</style>
    </button>
  )
}
