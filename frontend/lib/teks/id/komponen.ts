const komponen = {
  status: {
    diterima: "Diterima",
    ditandai: "Ditandai",
    ditolak: "Ditolak",
    debating: "Debating",
    tertunda: "Tertunda",
    draft: "Draft",
    aktif: "Aktif",
    selesai: "Selesai",
  } as Record<string, string>,
  bloom: {
    tingkat: {
      C1: "Mengingat",
      C2: "Memahami",
      C3: "Menerapkan",
      C4: "Menganalisis",
      C5: "Mengevaluasi",
      C6: "Mencipta",
    } as Record<string, string>,
    target: (target: string) => `target ${target}`,
    bergeser: (target: string, level: string) =>
      `Anda meminta ${target}, tetapi Arbiter menilai soal ini setingkat ${level}.`,
    sisa: (persen: number) => `sisa ${persen}%`,
    total: "Total",
    distribusi: (rincian: string) => `Distribusi Bloom: ${rincian}`,
  },
  konfirmasi: {
    konfirmasi: "Konfirmasi",
    batal: "Batal",
    memproses: "Memproses...",
  },
  tabel: {
    kosong: "Tidak ada data.",
  },
  breadcrumb: "Breadcrumb",
  ronde: {
    dariTotal: (sekarang: number, maks: number) => `Ronde ${sekarang} dari ${maks}`,
    label: (n: number) => `Ronde ${n}`,
  },
  skor: (skor: number, maks: number) => `Skor ${skor} dari ${maks}`,
  kelompokLipat: {
    kisiKisiKe: "Kisi-kisi ke-",
    dibuat: "Dibuat",
    butirDiterima: "butir diterima",
  },
};

export default komponen;
