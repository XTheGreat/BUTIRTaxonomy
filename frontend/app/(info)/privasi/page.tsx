import type { Metadata } from "next";
import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";

export const metadata: Metadata = { title: "Kebijakan Privasi - BUTIR" };

export default function PrivasiPage() {
  return (
    <HalamanInfo
      judul="Kebijakan Privasi"
      ringkasan="Ringkasan data apa yang dikumpulkan BUTIR dan bagaimana data itu dipakai. Pembaruan terakhir: 26 Oktober 2026."
    >
      <Bagian judul="Data yang kami simpan">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium">Akun guru atau dosen:</span> nama, alamat email, dan kata sandi. Kata sandi disimpan dalam bentuk
            hash, bukan teks asli.
          </li>
          <li>
            <span className="font-medium">Konten kerja guru atau dosen:</span> materi ajar yang diunggah, kisi-kisi, butir soal beserta
            riwayat debatnya, paket ujian, dan laporan.
          </li>
          <li>
            <span className="font-medium">Siswa atau mahasiswa:</span> nama yang diketik saat masuk ujian dan jawaban ujian. Siswa atau mahasiswa tidak
            membuat akun. Sebuah token rahasia disimpan di perangkat siswa atau mahasiswa untuk menandai identitas selama ujian.
          </li>
          <li>
            <span className="font-medium">Catatan teknis:</span> waktu, nama model, jumlah token, dan status setiap permintaan ke
            layanan AI, untuk memantau pemakaian dan galat.
          </li>
        </ul>
      </Bagian>

      <Bagian judul="Pemakaian layanan AI">
        <p>
          Untuk menghasilkan dan menelaah butir, potongan materi dan teks soal dikirim ke penyedia model AI pihak ketiga
          untuk diproses. Isi permintaan itu tidak disimpan dalam catatan teknis BUTIR. Jangan mengunggah materi yang
          bersifat rahasia atau berisi data pribadi yang tidak boleh diproses pihak ketiga.
        </p>
      </Bagian>

      <Bagian judul="Keamanan sesi">
        <p>
          Sesi masuk guru atau dosen berlaku terbatas dan dapat dicabut saat Anda keluar. Walau begitu, tidak ada sistem yang sepenuhnya
          bebas risiko, dan kami tidak dapat menjamin keamanan mutlak.
        </p>
      </Bagian>

      <Bagian judul="Penggunaan dan pembagian data">
        <p>
          Data dipakai hanya untuk menjalankan fitur BUTIR. Kami tidak menjual data. Data dapat diakses penyedia layanan
          yang dipakai untuk menjalankan sistem, seperti penyedia hosting dan penyedia model AI di atas.
        </p>
      </Bagian>

      <Bagian judul="Penghapusan data dan pertanyaan">
        <p>
          Guru atau dosen dapat menghapus materi, kisi-kisi, dan butir dari akun masing-masing. Untuk meminta penghapusan akun atau data
          siswa atau mahasiswa, atau bila ada pertanyaan, hubungi kami lewat kontak di bagian bawah halaman.
        </p>
      </Bagian>

      <p className="border-t border-[var(--line)] pt-4 font-mono text-[11px] text-[var(--ink-muted)]">
        Dokumen ini ringkasan awal untuk tahap pengembangan dan dapat berubah.
      </p>
    </HalamanInfo>
  );
}
