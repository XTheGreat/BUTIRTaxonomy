const dashboard = {
  judul: "Dashboard Naskah",
  deskripsi: "Lembar kerja telaah dan validasi butir soal.",
  buatKisiKisi: "Buat Kisi-kisi",
  statistik: {
    materi: { judul: "Materi Ajar", ket: "Dokumen kurikulum tersimpan" },
    bankSoal: { judul: "Bank Soal", ket: "Butir tervalidasi siap pakai" },
    perluTindakan: { judul: "Perlu Tindakan", ket: "Butir menunggu keputusan manual" },
    paketUjian: { judul: "Paket Ujian", ket: "Paket tersusun (draft & aktif)" },
  },
  distribusiBloom: {
    judul: "Distribusi Bloom | Bank Soal",
    deskripsi: "Persebaran tingkat kognitif dari seluruh butir yang telah diterima.",
    kosong: "Belum ada butir di bank soal.",
    total: "Total butir di bank soal",
    jumlahButir: "Jumlah butir",
    persentase: "Porsi dari total",
    ringkasan: "Ringkasan distribusi",
    terbanyak: "Porsi terbanyak",
    tersedikit: "Porsi paling sedikit",
    belumAda: "Belum ada butir",
    kolomSorotan: "Sorotan",
    kolomLevel: "Level Bloom",
    kolomPorsi: "Butir / porsi",
    jumlahTiapLevel: (jumlah: number) => `${jumlah} butir`,
    prefixPersentaseTiapLevel: "",
    suffixPersentaseTiapLevel: "tiap level",
  },
  perluTindakan: {
    judul: "Perlu Tindakan",
    deskripsi: "Daftar butir soal yang tidak mencapai konsensus agen dan membutuhkan verifikasi",
    lihatSemua: (jumlah: number) => `Lihat semua (${jumlah})`,
    kosongJudul: "Tidak ada butir yang menunggu tindakan",
    kosongDeskripsi:
      "Semua butir soal dari sesi debat terkini telah tervalidasi atau belum ada proses generasi yang aktif.",
    mulaiSesi: "Mulai Sesi Baru",
    periksaBank: "Periksa Bank Soal",
  },
  kolom: {
    pertanyaan: "Pertanyaan",
    bloom: "Bloom",
    status: "Status",
    ronde: "Ronde",
    telaahDebat: "Telaah Debat",
  },
};

export default dashboard;
