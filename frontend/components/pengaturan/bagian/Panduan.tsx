"use client";

import { BagianKepala, Subjudul } from "@/components/pengaturan/BagianKepala";
import { WARNA_GRAFIK } from "@/lib/warnaGrafik";
import { useTeks } from "@/lib/teks";

function Lokasi({ label, teks }: { label: string; teks: string }) {
  return (
    <p className="font-mono text-[11px] text-[var(--ink-muted)]">
      {label}: {teks}
    </p>
  );
}

function Petak({ warna, teks }: { warna: string; teks: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-1.5 h-2.5 w-2.5 shrink-0" style={{ backgroundColor: warna }} />
      <span>{teks}</span>
    </li>
  );
}

// Dua lilin contoh: satu naik (hijau), satu turun (merah), dengan penanda Buka/Tinggi/Rendah/Tutup.
function ContohLilin() {
  const t = useTeks();
  const g = t.telaah.grafik;
  const c = t.akun.pengaturan.panduan.lilin;
  const label = "fill-[var(--ink-muted)] font-mono text-[10px]";

  return (
    <svg role="img" aria-label={c.contoh} viewBox="0 0 340 170" className="h-auto w-full max-w-[340px]">
      <g stroke="var(--line)" strokeWidth="1">
        <line x1="10" x2="330" y1="40" y2="40" />
        <line x1="10" x2="330" y1="100" y2="100" />
        <line x1="10" x2="330" y1="160" y2="160" />
      </g>

      <g>
        <line x1="120" x2="120" y1="40" y2="140" stroke={WARNA_GRAFIK.naik} strokeWidth="2" />
        <rect x="104" y="62" width="32" height="58" fill={WARNA_GRAFIK.naik} />
        <g stroke="var(--ink-muted)" strokeWidth="1">
          <line x1="68" x2="100" y1="40" y2="40" />
          <line x1="68" x2="100" y1="62" y2="62" />
          <line x1="68" x2="100" y1="120" y2="120" />
          <line x1="68" x2="100" y1="140" y2="140" />
        </g>
        <text x="64" y="43" textAnchor="end" className={label}>{g.tinggi}</text>
        <text x="64" y="65" textAnchor="end" className={label}>{g.tutup}</text>
        <text x="64" y="123" textAnchor="end" className={label}>{g.buka}</text>
        <text x="64" y="143" textAnchor="end" className={label}>{g.rendah}</text>
        <text x="120" y="164" textAnchor="middle" className={label}>{g.naik}</text>
      </g>

      <g>
        <line x1="240" x2="240" y1="50" y2="130" stroke={WARNA_GRAFIK.turun} strokeWidth="2" />
        <rect x="224" y="68" width="32" height="46" fill={WARNA_GRAFIK.turun} />
        <text x="240" y="164" textAnchor="middle" className={label}>{g.turun}</text>
      </g>

      <g opacity="0.45">
        <line x1="300" x2="320" y1="100" y2="100" stroke={WARNA_GRAFIK.naik} strokeWidth="2" />
      </g>
    </svg>
  );
}

export default function Panduan() {
  const t = useTeks().akun.pengaturan.panduan;
  const g = useTeks().telaah.grafik;

  return (
    <div className="space-y-8">
      <BagianKepala judul={t.judul} keterangan={t.keterangan} />

      <section aria-labelledby="panduan-lilin" className="space-y-3">
        <Subjudul id="panduan-lilin">{t.lilin.judul}</Subjudul>
        <Lokasi label={t.lokasi} teks={t.lilin.lokasi} />
        <p className="text-sm leading-relaxed text-[var(--ink)]">{t.lilin.ringkas}</p>
        <ContohLilin />
        <dl className="divide-y divide-[var(--line)] border-y border-[var(--line)] text-sm">
          {(
            [
              [g.buka, t.lilin.buka],
              [g.tutup, t.lilin.tutup],
              [g.tinggi, t.lilin.tinggi],
              [g.rendah, t.lilin.rendah],
            ] as const
          ).map(([istilah, arti]) => (
            <div key={istilah} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[110px_1fr] sm:gap-4">
              <dt className="font-medium text-[var(--ink)]">{istilah}</dt>
              <dd className="text-[var(--ink-muted)]">{arti}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm leading-relaxed text-[var(--ink)]">{t.lilin.badan}</p>
        <ul className="space-y-2 text-sm leading-relaxed text-[var(--ink)]">
          <Petak warna={WARNA_GRAFIK.naik} teks={t.lilin.naik} />
          <Petak warna={WARNA_GRAFIK.turun} teks={t.lilin.turun} />
          <Petak warna="var(--line-strong)" teks={t.lilin.redup} />
        </ul>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t.lilin.interaksi}</p>
      </section>

      <section aria-labelledby="panduan-garis" className="space-y-2 border-t border-[var(--line)] pt-6">
        <Subjudul id="panduan-garis">{t.garis.judul}</Subjudul>
        <Lokasi label={t.lokasi} teks={t.garis.lokasi} />
        <p className="text-sm leading-relaxed text-[var(--ink)]">{t.garis.ringkas}</p>
        <p className="text-sm leading-relaxed text-[var(--ink)]">{t.garis.sumbu}</p>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t.garis.interaksi}</p>
      </section>

      <section aria-labelledby="panduan-bloom" className="space-y-2 border-t border-[var(--line)] pt-6">
        <Subjudul id="panduan-bloom">{t.bloom.judul}</Subjudul>
        <Lokasi label={t.lokasi} teks={t.bloom.lokasi} />
        <p className="text-sm leading-relaxed text-[var(--ink)]">{t.bloom.ringkas}</p>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t.bloom.catatan}</p>
      </section>

      <section aria-labelledby="panduan-meter" className="space-y-2 border-t border-[var(--line)] pt-6">
        <Subjudul id="panduan-meter">{t.meter.judul}</Subjudul>
        <Lokasi label={t.lokasi} teks={t.meter.lokasi} />
        <p className="text-sm leading-relaxed text-[var(--ink)]">{t.meter.ringkas}</p>
      </section>

      <div className="border-t border-[var(--line)] pt-4">
        <a
          href="/panduan"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--accent)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          {t.panduanLengkap}
        </a>
      </div>
    </div>
  );
}
