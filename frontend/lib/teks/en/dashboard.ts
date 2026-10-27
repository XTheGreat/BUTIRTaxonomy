import type dashboardId from "../id/dashboard";

const dashboard: typeof dashboardId = {
  judul: "Manuscript Dashboard",
  deskripsi: (nama) => `Your workspace for reviewing and validating exam items. Welcome back, ${nama}.`,
  pengajarDefault: "Instructor",
  buatKisiKisi: "Create Blueprint",
  statistik: {
    materi: { judul: "Course Materials", ket: "Curriculum documents saved" },
    bankSoal: { judul: "Item Bank", ket: "Validated items ready to use" },
    perluTindakan: { judul: "Needs Action", ket: "Items awaiting a manual decision" },
    paketUjian: { judul: "Exam Packages", ket: "Assembled packages (draft & active)" },
  },
  distribusiBloom: {
    judul: "Bloom Distribution | Item Bank",
    deskripsi: "Spread of cognitive levels across all accepted items.",
    kosong: "No items in the item bank yet.",
    total: "Total items in the item bank",
  },
  perluTindakan: {
    judul: "Needs Action",
    deskripsi: "Items the agents could not reach a consensus on, which need your verification",
    lihatSemua: (jumlah) => `View all (${jumlah})`,
    kosongJudul: "No items awaiting action",
    kosongDeskripsi:
      "All items from recent debate sessions have been validated, or no generation is currently running.",
    mulaiSesi: "Start New Session",
    periksaBank: "Check Item Bank",
  },
  kolom: {
    pertanyaan: "Question",
    bloom: "Bloom",
    status: "Status",
    ronde: "Round",
    telaahDebat: "Review Debate",
  },
};

export default dashboard;
