"use client";

import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";
import { useTeks } from "@/lib/teks";

export default function TentangIsi() {
  const t = useTeks();
  const p = t.info.tentang;

  return (
    <HalamanInfo judul={p.judul} ringkasan={p.ringkasan}>
      <Bagian judul={p.apaItu.judul}>
        <p>{p.apaItu.isi}</p>
      </Bagian>

      <Bagian judul={p.agen.judul}>
        <ul className="space-y-2">
          {p.agen.daftar.map(([nama, uraian]) => (
            <li key={nama}>
              <span className="font-medium">{nama}</span> {uraian}
            </li>
          ))}
        </ul>
        <p>{p.agen.penutup}</p>
      </Bagian>

      <Bagian judul={p.dariSoalSampaiUjian.judul}>
        <p>{p.dariSoalSampaiUjian.isi}</p>
      </Bagian>

      <Bagian judul={p.status.judul}>
        <p>{p.status.isi}</p>
      </Bagian>
    </HalamanInfo>
  );
}
