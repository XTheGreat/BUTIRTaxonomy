import type { Metadata } from "next";
import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";

export const metadata: Metadata = { title: "Panduan Penggunaan - BUTIR" };

const LANGKAH_GURU = [
  ["Daftar dan masuk", "Buat akun guru atau dosen lewat halaman Daftar, lalu masuk dengan email dan kata sandi."],
  ["Unggah materi ajar", "Di menu Materi Ajar, unggah berkas PDF, DOCX, TXT, atau MD (maksimal 10 MB)."],
  ["Buat kisi-kisi", "Di menu Kisi-kisi, pilih materi, jumlah butir, dan sebaran level Bloom yang totalnya 100%. Nama dan cakupan bab bersifat opsional."],
  ["Mulai generasi", "Jalankan generasi dan pantau debat agen lewat Lihat debat live pada tiap butir."],
  ["Tinjau hasil", "Butir yang diterima masuk ke Bank Soal. Periksa Butir Ditandai dan Butir Tertunda bila ada, lalu terima, ubah, atau ulangi."],
  ["Rakit ujian", "Di Rakit Ujian, pilih butir secara manual atau rakit otomatis berdasarkan sebaran Bloom, lalu terbitkan paket."],
  ["Bagikan kode akses", "Berikan kode akses ujian kepada siswa atau mahasiswa. Hasil dapat dirilis otomatis atau ditahan sampai Anda mengizinkan."],
];

const LANGKAH_SISWA = [
  ["Buka halaman masuk", "Pilih tab Siswa / Mahasiswa pada halaman masuk."],
  ["Isi kode akses", "Masukkan kode akses yang diberikan guru atau dosen, lalu tuliskan nama Anda."],
  ["Kerjakan ujian", "Jawab soal sebelum waktu habis. Jawaban tersimpan setiap kali Anda memilih opsi."],
  ["Lihat hasil", "Hasil tampil setelah guru atau dosen merilisnya."],
];

function Daftar({ data }: { data: string[][] }) {
  return (
    <ol className="space-y-3">
      {data.map(([judul, uraian], i) => (
        <li key={judul} className="flex gap-3">
          <span className="mt-0.5 w-5 shrink-0 font-mono text-xs tabular-nums text-[var(--accent)]">{i + 1}</span>
          <p>
            <span className="font-medium">{judul}.</span> <span className="text-[var(--ink-muted)]">{uraian}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function PanduanPage() {
  return (
    <HalamanInfo judul="Panduan Penggunaan" ringkasan="Langkah singkat untuk guru atau dosen dan siswa atau mahasiswa.">
      <Bagian judul="Untuk guru atau dosen">
        <Daftar data={LANGKAH_GURU} />
      </Bagian>

      <Bagian judul="Untuk siswa atau mahasiswa">
        <Daftar data={LANGKAH_SISWA} />
      </Bagian>

      <Bagian judul="Tips">
        <ul className="list-disc space-y-1.5 pl-5 text-[var(--ink-muted)]">
          <li>Soal level tinggi (C5 dan C6) lebih sulit dihasilkan, jadi sebagian butirnya mungkin ditandai atau tertunda.</li>
          <li>Butir tertunda biasanya karena layanan AI sedang bermasalah. Buka Butir Tertunda lalu klik Ulangi.</li>
          <li>Selalu baca ulang butir hasil AI sebelum dipakai untuk penilaian resmi.</li>
        </ul>
      </Bagian>
    </HalamanInfo>
  );
}
