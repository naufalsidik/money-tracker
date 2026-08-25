import Link from 'next/link'

// Kerangka bersama semua kartu ringkasan di home. Modul hanya menyuplai
// angkanya; tata letak, status memuat, dan penanganan galat ada di sini
// supaya semua kartu berperilaku sama.
//
// v2: label naik dari 11px ke 12px, angka utama dari weight 500 ke 700,
// dan nilai rinci netral secara default.
//
// Prop `warna` pada tiap rinci masih dihormati supaya modul lama tidak
// putus, tapi seharusnya sudah tidak dipakai lagi. Nominal biasa netral;
// warna hanya untuk selisih dan pelanggaran budget. Nilai `warna` itu
// datang dari modul, kemungkinan lib/modules.js — di situ tempat
// membersihkannya, bukan di sini.
export default function KartuRingkasan({
  modul, memuat, galat, utama, labelUtama, rinci = [],
}) {
  const { href, label, Icon, deskripsi } = modul

  return (
    <div className="bungkus">
      {/* styled-jsx hanya menempelkan kelas scoping ke elemen DOM asli,
          bukan ke komponen seperti Link. Karena itu Link ditata lewat
          `.bungkus :global(.kartu)`, bukan lewat kelas biasa. */}
      <Link href={href} className="kartu">
        <div className="atas">
          <span className="ikon"><Icon /></span>
          <span className="judul">{label}</span>
          <span className="panah" aria-hidden="true">→</span>
        </div>

        {galat ? (
          <p className="galat">Gagal memuat ringkasan</p>
        ) : memuat ? (
          <div className="rangka" aria-hidden="true" />
        ) : (
          <>
            <p className="label-utama">{labelUtama}</p>
            <p className="utama num">{utama}</p>
            <dl className="rinci">
              {rinci.map(r => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd className="num" style={r.warna ? { color: r.warna } : undefined}>{r.nilai}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <span className="sr">{deskripsi}</span>
      </Link>

      <style jsx>{`
        .bungkus :global(.kartu) {
          display: block;
          background: var(--surface);
          border: var(--border-width) solid var(--border);
          border-radius: var(--radius-md);
          padding: var(--pad-card);
          text-decoration: none;
          color: var(--ink);
          box-shadow: var(--shadow-card);
          transition: border-color var(--dur-fast) var(--ease),
                      transform var(--dur-fast) var(--ease);
        }
        .bungkus :global(.kartu:hover) {
          border-color: var(--accent-quiet);
          transform: translateY(-1px);
        }

        .atas {
          display: flex; align-items: center; gap: var(--space-2);
          margin-bottom: var(--space-5);
        }
        .ikon { display: inline-flex; color: var(--accent); }
        .judul {
          font-family: var(--font-display);
          font-weight: 700; font-size: var(--text-lg);
          letter-spacing: var(--tracking-tight);
          color: var(--ink);
        }
        .panah { margin-left: auto; color: var(--muted); font-size: var(--text-md); }
        .bungkus :global(.kartu:hover) .panah { color: var(--accent); }

        .label-utama {
          font-family: var(--font-body);
          font-size: var(--text-xs);
          font-weight: 500;
          letter-spacing: var(--tracking-label);
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: var(--space-1);
        }
        .utama {
          font-size: var(--text-2xl);
          font-weight: 700;
          line-height: var(--leading-tight);
          letter-spacing: var(--tracking-tight);
          color: var(--ink);
        }

        /* Grid, bukan flex: kolom melebar mengisi kartu supaya tidak
           menyisakan ruang kosong di kanan. */
        .rinci {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: var(--space-3) var(--space-4);
          margin-top: var(--space-5);
          padding-top: var(--space-3);
          border-top: var(--border-width) solid var(--border);
        }
        .rinci dt {
          font-family: var(--font-body);
          font-size: var(--text-xs);
          font-weight: 500;
          letter-spacing: var(--tracking-label);
          text-transform: uppercase;
          color: var(--muted);
        }
        .rinci dd {
          font-size: var(--text-md);
          font-weight: 600;
          color: var(--ink);
          margin-top: 2px;
        }

        .rangka {
          height: 74px;
          border-radius: var(--radius-sm);
          background: var(--surface-2);
        }
        .galat { color: var(--danger); font-size: var(--text-sm); }

        .sr {
          position: absolute; width: 1px; height: 1px;
          overflow: hidden; clip-path: inset(50%); white-space: nowrap;
        }

        @media (max-width: 767px) {
          .utama { font-size: var(--text-xl); }
        }
      `}</style>
    </div>
  )
}
