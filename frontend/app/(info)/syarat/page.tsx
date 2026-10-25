import type { Metadata } from "next";
import HalamanInfo, { Bagian } from "@/components/layout/HalamanInfo";

export const metadata: Metadata = { title: "Syarat Penggunaan - BUTIR" };

export default function SyaratPage() {
  return (
    <HalamanInfo
      judul="Syarat Penggunaan"
      ringkasan="Aturan dasar memakai BUTIR. Dengan memakai layanan ini Anda menyetujuinya. Pembaruan terakhir: 26 Oktober 2026."
    >
      <Bagian judul="Pemakaian yang wajar">
        <p>
          BUTIR dipakai untuk menyusun dan melaksanakan ujian yang sah. Dilarang memakainya untuk melanggar hukum, mengganggu
          layanan, mengakses akun orang lain, atau mengirim permintaan otomatis secara berlebihan.
        </p>
      </Bagian>

      <Bagian judul="Materi yang Anda unggah">
        <p>
          Anda bertanggung jawab atas materi yang diunggah, termasuk hak cipta dan izin pemakaiannya. Unggahlah hanya
          materi yang Anda berhak memakainya.
        </p>
      </Bagian>

      <Bagian judul="Hasil buatan AI">
        <p>
          Butir soal dibuat dan ditelaah oleh model AI yang dapat keliru. Hasilnya adalah bahan bantu, bukan keputusan
          final. Guru atau dosen bertanggung jawab meninjau setiap butir sebelum dipakai untuk penilaian.
        </p>
      </Bagian>

      <Bagian judul="Ketersediaan layanan">
        <p>
          BUTIR masih dalam pengembangan awal dan disediakan apa adanya, tanpa jaminan ketersediaan terus-menerus. Fitur, batas
          pemakaian, dan paket dapat berubah. Simpan salinan butir penting Anda lewat fitur ekspor.
        </p>
      </Bagian>

      <Bagian judul="Pembatasan akun">
        <p>
          Akun dapat dibatasi atau dihentikan bila terbukti melanggar syarat ini atau membahayakan layanan.
        </p>
      </Bagian>

      <p className="border-t border-[var(--line)] pt-4 font-mono text-[11px] text-[var(--ink-muted)]">
        Dokumen ini ringkasan awal untuk tahap pengembangan dan dapat berubah.
      </p>
    </HalamanInfo>
  );
}
