const persiapan = {
  umum: {
    hapus: "Hapus",
  },
  materi: {
    judul: "Materi Ajar",
    deskripsi:
      "Dokumen rujukan kurikulum dan materi pembelajaran sebagai sumber penyusunan butir soal.",
    formatTidakDidukung:
      "Format berkas tidak didukung. Gunakan PDF, DOCX, TXT, atau MD.",
    ukuranMelebihi: (mb: number) => `Ukuran berkas melebihi batas ${mb} MB.`,
    pilihBerkasDulu: "Silakan pilih file materi terlebih dahulu.",
    gagalUnggah: "Gagal mengunggah materi.",
    unggah: {
      judul: "Unggah Materi Baru",
      keterangan:
        "Teks materi akan dipecah secara semantik untuk referensi konteks agen AI.",
      labelJudul: "Judul Materi Pembelajaran",
      placeholderJudul: "Contoh: Bab 3 - Dinamika Gerak dan Hukum Newton",
      bantuanJudul: "Tuliskan nama bab atau topik yang spesifik dan jelas",
      labelBerkas: "Berkas Naskah Materi",
      lepasDiZona: "Lepaskan untuk memilih berkas ini",
      lepasDiHalaman: "Lepaskan berkas di mana saja pada halaman ini",
      klikAtauSeret: "Klik untuk memilih berkas atau seret ke sini",
      formatBerkas: (mb: number) =>
        `Format berkas: PDF (.pdf), Word (.docx), Teks (.txt, .md) UTF-8 · maks ${mb} MB`,
      catatanKonversi:
        "Berkas PDF dan DOCX otomatis dikonversi menjadi Markdown secara deterministik sebelum diindeks ke dalam potongan materi.",
      menyimpan: "Menyimpan Berkas...",
      tombolUnggah: "Unggah & Simpan Materi",
    },
    daftar: {
      judul: "Daftar Materi Terdaftar",
      jumlahDokumen: (n: number) => `${n} dokumen tersimpan`,
      kosongJudul: "Belum ada materi pembelajaran",
      kosongDeskripsi:
        "Unggah materi pertama melalui formulir di atas untuk mulai menyusun kisi-kisi dan butir soal.",
      kolomJudul: "Judul Materi",
      kolomTanggal: "Tanggal Unggah",
      kolomAksi: "Aksi",
      navigasiHalaman: "Navigasi daftar materi terdaftar",
      rentang: (awal: number, akhir: number, total: number) => `Menampilkan ${awal}–${akhir} dari ${total}`,
      halaman: (saat: number, total: number) => `Halaman ${saat} dari ${total}`,
      sebelumnya: "Sebelumnya",
      berikutnya: "Berikutnya",
    },
    hapusDialog: {
      judul: "Hapus Materi Ajar",
      deskripsi: (judul: string | undefined) =>
        `Materi "${judul}" beserta seluruh potongan teksnya akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`,
      konfirmasi: "Hapus Permanen",
    },
  },
  kisiKisi: {
    judul: "Rancang Kisi-kisi",
    deskripsi:
      "Spesifikasi teknis proporsi kognitif Taksonomi Bloom dan materi rujukan butir ujian.",
    bloom: {
      C1: "Mengingat",
      C2: "Memahami",
      C3: "Menerapkan",
      C4: "Menganalisis",
      C5: "Mengevaluasi",
      C6: "Mencipta",
    } as Record<string, string>,
    pesan: {
      totalBloom: (total: number) =>
        `Total persentase distribusi Bloom harus tepat 100% (saat ini ${total}%).`,
      pilihMateri: "Pilih minimal satu materi ajar sebagai rujukan.",
      rentangButir: "Jumlah butir harus antara 1 dan 50.",
      gagalSimpan: "Gagal menyimpan kisi-kisi.",
      perubahanDisimpan: "Perubahan kisi-kisi disimpan.",
      disimpanSebagaiDraf:
        "Kisi-kisi disimpan sebagai draf. Mulai debat kapan saja dari daftar di bawah.",
      dihapus: "Kisi-kisi dihapus.",
      aksiGagal: "Aksi gagal dijalankan.",
    },
    sedangMengubah:
      "Sedang mengubah kisi-kisi tersimpan. Perubahan baru berlaku setelah disimpan.",
    batalUbah: "Batal ubah",
    materiRujukan: {
      label: "Materi Pembelajaran Rujukan",
      keterangan:
        "Pilih satu atau lebih dokumen materi yang akan dijadikan basis ekstraksi butir.",
      kosong: "Belum ada materi ajar terdaftar.",
      linkUnggah: "Unggah dokumen materi terlebih dahulu",
      navigasiHalaman: "Navigasi materi pembelajaran rujukan",
      rentang: (awal: number, akhir: number, total: number) => `Menampilkan ${awal}–${akhir} dari ${total}`,
      halaman: (saat: number, total: number) => `Halaman ${saat} dari ${total}`,
      sebelumnya: "Sebelumnya",
      berikutnya: "Berikutnya",
    },
    jumlahButir: {
      label: "Jumlah Target Butir Soal",
      bantuan: "Direkomendasikan 5–15 butir per siklus telaah deliberatif",
    },
    distribusi: {
      label: "Distribusi Tingkat Kognitif Bloom (%)",
      keterangan:
        "Proporsi bobot butir soal dari tingkat dasar hingga tingkat tinggi (HOTS)",
      kosongkanSemua: "Kosongkan semua",
      total: "Total:",
      totalTidakPas: (total: number) =>
        `Total distribusi saat ini ${total}%. Harus persis 100% untuk melanjutkan.`,
    },
    opsional: {
      labelNama: "Nama Kisi-kisi (Opsional)",
      placeholderNama: "Misal: Kisi-kisi A, atau UTS Fisika Kelas X",
      bantuanNama:
        "Dipakai sebagai judul kelompok soal di Bank Soal dan Rakit Ujian. Bila kosong, memakai judul materi",
      labelCakupan: "Cakupan Bab & Fokus Indikator (Opsional)",
      placeholderCakupan:
        "Misal: Fokuskan pada Hukum Newton II dan penerapannya pada bidang miring...",
      bantuanCakupan:
        "Kata kunci dipakai untuk memilih potongan materi yang relevan, lalu diteruskan ke Agen Penyusun sebagai fokus soal",
    },
    tombol: {
      menyimpan: "Menyimpan...",
      simpanPerubahan: "Simpan Perubahan",
      simpan: "Simpan Kisi-kisi",
      catatanDebat:
        "Debat dimulai dari daftar Kisi-kisi Tersimpan di bawah, bukan otomatis.",
    },
    tersimpan: {
      judul: "Kisi-kisi Tersimpan",
      jumlah: (n: number) => `${n} kisi-kisi`,
      kosong:
        "Belum ada kisi-kisi. Simpan satu di atas; draf yang belum dijalankan bisa diubah atau dihapus.",
      tanpaMateri: "Tanpa materi",
      materi: "Materi:",
      targetAwal: "Target",
      targetAkhir: "butir",
      butirDibuat: "butir dibuat",
      cakupan: "Cakupan:",
      mulaiGenerasi: "Mulai Generasi",
      ubah: "Ubah",
      lihatProgres: "Lihat Progres",
      navigasiHalaman: "Navigasi kisi-kisi tersimpan",
      rentang: (awal: number, akhir: number, total: number) => `Menampilkan ${awal}–${akhir} dari ${total}`,
      halaman: (saat: number, total: number) => `Halaman ${saat} dari ${total}`,
      sebelumnya: "Sebelumnya",
      berikutnya: "Berikutnya",
    },
    dialogMulai: {
      judul: "Mulai Debat Multi-Agen",
      deskripsi:
        "Kisi-kisi ini akan dijalankan sekarang. Setelah dimulai, kisi-kisi tidak bisa diubah atau dihapus.",
      konfirmasi: "Mulai Generasi",
      jumlahTarget: "Jumlah butir target",
      materiRujukan: "Materi rujukan",
    },
    dialogHapus: {
      judul: "Hapus Kisi-kisi",
      deskripsi:
        "Kisi-kisi draf ini akan dihapus permanen. Materi ajar tidak ikut terhapus.",
      konfirmasi: "Hapus",
    },
    cakupan: {
      cocok: (cocok: number, total: number) =>
        `Cakupan cocok dengan ${cocok} dari ${total} potongan materi; soal dibuat dari potongan itu.`,
      tidakCocok: (kataKunci: string) =>
        `Cakupan tidak ditemukan di materi (kata kunci: ${kataKunci}). Seluruh materi akan dipakai.`,
    },
  },
  generasi: {
    judul: "Progres Debat Multi-Agen",
    deskripsi:
      "Simulasi deliberasi empat agen AI (Penyusun, Kritikus, Penjawab Buta, Arbiter) untuk menguji validitas tiap butir.",
    butirDitandai: "Butir Ditandai",
    bukaBankSoal: "Buka Bank Soal",
    memuat: "Memuat progres...",
    belumDijalankan: {
      judul: "Kisi-kisi ini belum dijalankan",
      deskripsi:
        "Debat dimulai dari daftar Kisi-kisi Tersimpan, supaya Anda memilih kisi-kisi yang tepat sebelum agen bekerja.",
      tombol: "Buka Kisi-kisi Tersimpan",
    },
    mempersiapkan: {
      judul: "Mempersiapkan Butir Soal...",
      deskripsi:
        "Sistem sedang mempersiapkan butir soal untuk didebatkan. Jika ada generasi lain yang masih berjalan, proses ini akan menunggu giliran.",
      menunggu: "Menunggu antrean...",
    },
    progres: {
      diproses: (n: number, total: number) =>
        `${n} dari ${total} butir diproses`,
      sinkronisasi: "Sinkronisasi live...",
      selesai: "✓ Selesai",
      catatanLatarBelakang:
        "Proses deliberasi 4 agen AI dijalankan di latar belakang server. Anda dapat berpindah halaman atau meninggalkan laman ini dengan aman tanpa khawatir progres hilang. Tombol kembali ke debat akan muncul di bilah atas jika Anda berpindah ke halaman lain.",
      tertundaAwal: (n: number) => `${n} butir berstatus`,
      tertundaKata: "tertunda",
      tertundaAkhir:
        "karena kendala panggilan agen. Jika terdapat butir tertunda, pergi ke halaman Butir Tertunda lalu ulangi butir.",
      bukaButirTertunda: "Buka Butir Tertunda",
    },
    tabel: {
      bloom: "Bloom",
      status: "Status",
      ronde: "Ronde",
      keteranganNaskah: "Keterangan Naskah",
      debat: "Debat",
      menungguGiliran: "Menunggu giliran telaah agen...",
      lihatDebatLive: "Lihat debat live",
    },
    kisi: {
      ariaLabel: "Kisi-kisi yang didebatkan",
      judul: "Kisi-kisi yang Didebatkan",
      nama: "Nama",
      tanpaNama: "Tanpa nama",
      jumlahButir: "Jumlah butir",
      materiRujukan: "Materi rujukan",
      tanpaMateri: "Tanpa materi",
      cakupanBab: "Cakupan bab",
      distribusiBloom: "Distribusi Bloom",
    },
  },
};

export default persiapan;
