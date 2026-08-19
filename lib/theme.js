import { useState, useEffect, useCallback } from 'react'

const KUNCI = 'tema'

function bacaTema() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

// Nilai awal sengaja 'light' di server dan di render pertama klien.
// Kalau dibaca langsung dari localStorage saat inisialisasi, HTML server
// dan klien berbeda dan React melempar peringatan hydration mismatch.
// Nilai sebenarnya sudah dipasang ke <html> oleh skrip di _document,
// jadi tampilannya sudah benar sebelum efek ini jalan.
export function useTema() {
  const [tema, setTema] = useState('light')

  useEffect(() => { setTema(bacaTema()) }, [])

  const ganti = useCallback(() => {
    setTema(prev => {
      const baru = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', baru)
      try { localStorage.setItem(KUNCI, baru) } catch (e) {}
      return baru
    })
  }, [])

  return { tema, ganti }
}
