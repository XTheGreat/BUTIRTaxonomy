import type { Metadata } from "next";
import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";

export const metadata: Metadata = { title: "Tentang - BUTIR" };

const AGEN = [
  ["Penyusun", "menulis butir soal pilihan ganda dari materi yang Anda unggah, sesuai level Bloom yang diminta."],
  ["Kritikus", "menelaah soal dengan lima aspek rubrik dan memberi usulan perbaikan."],
  ["Penjawab Buta", "mengerjakan soal tanpa diberi tahu kunci jawaban, untuk menguji apakah soal jelas dan tidak ambigu."],
  ["Arbiter", "memutuskan apakah butir diterima, perlu revisi, atau ditolak, serta menilai level kognitif sebenarnya."],
];

export default function TentangPage() {
  return (
    <HalamanInfo
      judul="Tentang BUTIR"
      ringkasan="Sistem untuk menyusun dan memvalidasi butir soal ujian secara lebih cepat, dengan guru atau dosen tetap memegang keputusan akhir."
    >
      <Bagian judul="Apa itu BUTIR">
        <p>
          BUTIR membantu guru atau dosen membuat soal pilihan ganda yang sudah ditelaah sebelum sampai ke siswa atau mahasiswa. Guru atau dosen mengunggah
          materi ajar, menentukan kisi-kisi beserta sebaran level taksonomi Bloom (C1 sampai C6), lalu sistem
          menghasilkan butir soal dan mengujinya lewat debat antaragen AI.
        </p>
      </Bagian>

      <Bagian judul="Empat agen dalam satu debat">
        <ul className="space-y-2">
          {AGEN.map(([nama, uraian]) => (
            <li key={nama}>
              <span className="font-medium">{nama}</span> {uraian}
            </li>
          ))}
        </ul>
        <p>
          Debat berlangsung hingga tiga ronde per butir. Butir yang lolos masuk ke Bank Soal. Butir yang belum disepakati
          ditandai agar guru atau dosen dapat meninjau sendiri sebelum dipakai.
        </p>
      </Bagian>

      <Bagian judul="Dari soal sampai ujian">
        <p>
          Butir yang diterima dapat dirakit menjadi paket ujian, diterbitkan dengan kode akses, dan dikerjakan siswa atau mahasiswa
          tanpa perlu membuat akun. Guru atau dosen dapat melihat laporan analisis butir setelah ujian selesai.
        </p>
      </Bagian>

      <Bagian judul="Status proyek">
        <p>
          BUTIR masih dalam tahap pengembangan awal oleh satu pengembang. Fitur dan tampilan dapat berubah, dan hasil
          buatan AI selalu perlu ditinjau guru atau dosen sebelum dipakai untuk penilaian. Untuk pertanyaan atau masukan, gunakan
          kontak di bagian bawah halaman.
        </p>
      </Bagian>
    </HalamanInfo>
  );
}
