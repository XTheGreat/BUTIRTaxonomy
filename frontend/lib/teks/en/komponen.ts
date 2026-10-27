import type komponenId from "../id/komponen";

const komponen: typeof komponenId = {
  status: {
    diterima: "Accepted",
    ditandai: "Flagged",
    ditolak: "Rejected",
    debating: "Debating",
    tertunda: "Pending",
    draft: "Draft",
    aktif: "Active",
    selesai: "Completed",
  },
  bloom: {
    tingkat: {
      C1: "Remember",
      C2: "Understand",
      C3: "Apply",
      C4: "Analyze",
      C5: "Evaluate",
      C6: "Create",
    },
    target: (target) => `target ${target}`,
    bergeser: (target, level) =>
      `You requested ${target}, but the Arbiter rated this question at ${level}.`,
    sisa: (persen) => `${persen}% left`,
    total: "Total",
    distribusi: (rincian) => `Bloom distribution: ${rincian}`,
  },
  konfirmasi: {
    konfirmasi: "Confirm",
    batal: "Cancel",
    memproses: "Processing...",
  },
  tabel: {
    kosong: "No data.",
  },
  breadcrumb: "Breadcrumb",
  ronde: {
    dariTotal: (sekarang, maks) => `Round ${sekarang} of ${maks}`,
    label: (n) => `Round ${n}`,
  },
  skor: (skor, maks) => `Score ${skor} of ${maks}`,
  kelompokLipat: {
    kisiKisiKe: "Blueprint no. ",
    dibuat: "Created",
    butirDiterima: "accepted items",
  },
};

export default komponen;
