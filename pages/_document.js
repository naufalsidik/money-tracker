import { Html, Head, Main, NextScript } from 'next/document'

// Dijalankan sebelum React mount. Tanpa ini, halaman sempat tampil
// terang lalu berkedip ke gelap begitu komponen selesai dipasang.
const TEMA_AWAL = `
(function(){
  try {
    var t = localStorage.getItem('tema');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`

export default function Document() {
  return (
    <Html lang="id" data-theme="light">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700;800&family=Source+Sans+3:ital,wght@0,300..700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: TEMA_AWAL }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
