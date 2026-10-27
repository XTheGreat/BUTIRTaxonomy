import type galatUjianId from "../id/galatUjian";

type P = Record<string, unknown>;

const galatUjian: typeof galatUjianId = {
  ujian_tidak_ditemukan: "Exam not found",
  ujian_bukan_milik_anda: "This is not your exam",
  ujian_butir_tidak_ditemukan: (p: P) => `Item ${p.id} not found`,
  ujian_butir_belum_diterima: (p: P) => `Item ${p.id} has not been accepted yet`,
  ujian_format_ekspor_tidak_valid: "Export format must be pdf or docx",
  ujian_peserta_tidak_ditemukan: "Participant not found",
  ujian_belum_diterbitkan: "The exam has not been published yet",
  ujian_rilis_otomatis: "This exam uses automatic release: students see their results as soon as they submit",
  ujian_sudah_diterbitkan: "This exam has already been published",
  ujian_waktu_selesai_sebelum_mulai: "The end time must be after the start time",
  paket_pilihan_tidak_valid: (p: P) => `Plan must be one of: ${p.daftar}`,
  paket_pengguna_tidak_ditemukan: "User not found",
  paket_kuota_soal_institusi: (p: P) =>
    `The ${p.institusi} institution's question quota for this month has ${p.sisa} of ${p.batas} left, but this blueprint requests ${p.jumlah}. Reduce the number of items or contact your institution admin.`,
  paket_kuota_soal_paket: (p: P) =>
    `The ${p.paket} plan's question quota for this month has ${p.sisa} of ${p.batas} left, but this blueprint requests ${p.jumlah}. Reduce the number of items or upgrade to the Pro plan.`,
  paket_kuota_materi: (p: P) =>
    `The ${p.paket} plan is limited to ${p.batas} teaching materials. Delete materials you no longer use or upgrade to the Pro plan.`,
  paket_ekspor_butuh_pro: "PDF and DOCX export is available on the Pro plan. Upgrade to use this feature.",
};

export default galatUjian;
