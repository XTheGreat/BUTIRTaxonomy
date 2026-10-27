const info = {
  halaman: {
    masuk: "Masuk",
    kembaliKeMasuk: "Kembali ke halaman masuk",
  },
  panduan: {
    judul: "Panduan Penggunaan",
    ringkasan: "Langkah singkat untuk guru atau dosen dan siswa atau mahasiswa.",
    guru: {
      judul: "Untuk guru atau dosen",
      langkah: [
        ["Daftar dan masuk", "Buat akun guru atau dosen lewat halaman Daftar, lalu masuk dengan email dan kata sandi."],
        ["Unggah materi ajar", "Di menu Materi Ajar, unggah berkas PDF, DOCX, TXT, atau MD (maksimal 10 MB)."],
        ["Buat kisi-kisi", "Di menu Kisi-kisi, pilih materi, jumlah butir, dan sebaran level Bloom yang totalnya 100%. Nama dan cakupan bab bersifat opsional."],
        ["Mulai generasi", "Jalankan generasi dan pantau debat agen lewat Lihat debat live pada tiap butir."],
        ["Tinjau hasil", "Butir yang diterima masuk ke Bank Soal. Periksa Butir Ditandai dan Butir Tertunda bila ada, lalu terima, ubah, atau ulangi."],
        ["Rakit ujian", "Di Rakit Ujian, pilih butir secara manual atau rakit otomatis berdasarkan sebaran Bloom, lalu terbitkan paket."],
        ["Bagikan kode akses", "Berikan kode akses ujian kepada siswa atau mahasiswa. Hasil dapat dirilis otomatis atau ditahan sampai Anda mengizinkan."],
      ],
    },
    siswa: {
      judul: "Untuk siswa atau mahasiswa",
      langkah: [
        ["Buka halaman masuk", "Pilih tab Siswa / Mahasiswa pada halaman masuk."],
        ["Isi kode akses", "Masukkan kode akses yang diberikan guru atau dosen, lalu tuliskan nama Anda."],
        ["Kerjakan ujian", "Jawab soal sebelum waktu habis. Jawaban tersimpan setiap kali Anda memilih opsi."],
        ["Lihat hasil", "Hasil tampil setelah guru atau dosen merilisnya."],
      ],
    },
    tips: {
      judul: "Tips",
      butir: [
        "Soal level tinggi (C5 dan C6) lebih sulit dihasilkan, jadi sebagian butirnya mungkin ditandai atau tertunda.",
        "Butir tertunda biasanya karena layanan AI sedang bermasalah. Buka Butir Tertunda lalu klik Ulangi.",
        "Selalu baca ulang butir hasil AI sebelum dipakai untuk penilaian resmi.",
      ],
    },
  },
  privasi: {
    judul: "Kebijakan Privasi",
    ringkasan:
      "Ringkasan data apa yang dikumpulkan BUTIR dan bagaimana data itu dipakai. Pembaruan terakhir: 26 Oktober 2026.",
    data: {
      judul: "Data yang kami simpan",
      butir: [
        ["Akun guru atau dosen:", "nama, alamat email, dan kata sandi. Kata sandi disimpan dalam bentuk hash, bukan teks asli."],
        ["Konten kerja guru atau dosen:", "materi ajar yang diunggah, kisi-kisi, butir soal beserta riwayat debatnya, paket ujian, dan laporan."],
        ["Siswa atau mahasiswa:", "nama yang diketik saat masuk ujian dan jawaban ujian. Siswa atau mahasiswa tidak membuat akun. Sebuah token rahasia disimpan di perangkat siswa atau mahasiswa untuk menandai identitas selama ujian."],
        ["Catatan teknis:", "waktu, nama model, jumlah token, dan status setiap permintaan ke layanan AI, untuk memantau pemakaian dan galat."],
      ],
    },
    ai: {
      judul: "Pemakaian layanan AI",
      isi: "Untuk menghasilkan dan menelaah butir, potongan materi dan teks soal dikirim ke penyedia model AI pihak ketiga untuk diproses. Isi permintaan itu tidak disimpan dalam catatan teknis BUTIR. Jangan mengunggah materi yang bersifat rahasia atau berisi data pribadi yang tidak boleh diproses pihak ketiga.",
    },
    sesi: {
      judul: "Keamanan sesi",
      isi: "Sesi masuk guru atau dosen berlaku terbatas dan dapat dicabut saat Anda keluar. Walau begitu, tidak ada sistem yang sepenuhnya bebas risiko, dan kami tidak dapat menjamin keamanan mutlak.",
    },
    pembagian: {
      judul: "Penggunaan dan pembagian data",
      isi: "Data dipakai hanya untuk menjalankan fitur BUTIR. Kami tidak menjual data. Data dapat diakses penyedia layanan yang dipakai untuk menjalankan sistem, seperti penyedia hosting dan penyedia model AI di atas.",
    },
    penghapusan: {
      judul: "Penghapusan data dan pertanyaan",
      isi: "Guru atau dosen dapat menghapus materi, kisi-kisi, dan butir dari akun masing-masing. Untuk meminta penghapusan akun atau data siswa atau mahasiswa, atau bila ada pertanyaan, hubungi kami lewat kontak di bagian bawah halaman.",
    },
    catatanAkhir: "Dokumen ini ringkasan awal untuk tahap pengembangan dan dapat berubah.",
  },
  syarat: {
    judul: "Syarat Penggunaan",
    ringkasan:
      "Aturan dasar memakai BUTIR. Dengan memakai layanan ini Anda menyetujuinya. Pembaruan terakhir: 26 Oktober 2026.",
    pemakaian: {
      judul: "Pemakaian yang wajar",
      isi: "BUTIR dipakai untuk menyusun dan melaksanakan ujian yang sah. Dilarang memakainya untuk melanggar hukum, mengganggu layanan, mengakses akun orang lain, atau mengirim permintaan otomatis secara berlebihan.",
    },
    materi: {
      judul: "Materi yang Anda unggah",
      isi: "Anda bertanggung jawab atas materi yang diunggah, termasuk hak cipta dan izin pemakaiannya. Unggahlah hanya materi yang Anda berhak memakainya.",
    },
    hasilAi: {
      judul: "Hasil buatan AI",
      isi: "Butir soal dibuat dan ditelaah oleh model AI yang dapat keliru. Hasilnya adalah bahan bantu, bukan keputusan final. Guru atau dosen bertanggung jawab meninjau setiap butir sebelum dipakai untuk penilaian.",
    },
    ketersediaan: {
      judul: "Ketersediaan layanan",
      isi: "BUTIR masih dalam pengembangan awal dan disediakan apa adanya, tanpa jaminan ketersediaan terus-menerus. Fitur, batas pemakaian, dan paket dapat berubah. Simpan salinan butir penting Anda lewat fitur ekspor.",
    },
    pembatasan: {
      judul: "Pembatasan akun",
      isi: "Akun dapat dibatasi atau dihentikan bila terbukti melanggar syarat ini atau membahayakan layanan.",
    },
    catatanAkhir: "Dokumen ini ringkasan awal untuk tahap pengembangan dan dapat berubah.",
  },
  tentang: {
    judul: "Tentang BUTIR",
    ringkasan:
      "Sistem untuk menyusun dan memvalidasi butir soal ujian secara lebih cepat, dengan guru atau dosen tetap memegang keputusan akhir.",
    apaItu: {
      judul: "Apa itu BUTIR",
      isi: "BUTIR membantu guru atau dosen membuat soal pilihan ganda yang sudah ditelaah sebelum sampai ke siswa atau mahasiswa. Guru atau dosen mengunggah materi ajar, menentukan kisi-kisi beserta sebaran level taksonomi Bloom (C1 sampai C6), lalu sistem menghasilkan butir soal dan mengujinya lewat debat antaragen AI.",
    },
    agen: {
      judul: "Empat agen dalam satu debat",
      daftar: [
        ["Penyusun", "menulis butir soal pilihan ganda dari materi yang Anda unggah, sesuai level Bloom yang diminta."],
        ["Kritikus", "menelaah soal dengan lima aspek rubrik dan memberi usulan perbaikan."],
        ["Penjawab Buta", "mengerjakan soal tanpa diberi tahu kunci jawaban, untuk menguji apakah soal jelas dan tidak ambigu."],
        ["Arbiter", "memutuskan apakah butir diterima, perlu revisi, atau ditolak, serta menilai level kognitif sebenarnya."],
      ],
      penutup: "Debat berlangsung hingga tiga ronde per butir. Butir yang lolos masuk ke Bank Soal. Butir yang belum disepakati ditandai agar guru atau dosen dapat meninjau sendiri sebelum dipakai.",
    },
    dariSoalSampaiUjian: {
      judul: "Dari soal sampai ujian",
      isi: "Butir yang diterima dapat dirakit menjadi paket ujian, diterbitkan dengan kode akses, dan dikerjakan siswa atau mahasiswa tanpa perlu membuat akun. Guru atau dosen dapat melihat laporan analisis butir setelah ujian selesai.",
    },
    status: {
      judul: "Status proyek",
      isi: "BUTIR masih dalam tahap pengembangan awal oleh satu pengembang. Fitur dan tampilan dapat berubah, dan hasil buatan AI selalu perlu ditinjau guru atau dosen sebelum dipakai untuk penilaian. Untuk pertanyaan atau masukan, gunakan kontak di bagian bawah halaman.",
    },
  },
};

export default info;
