import type id from "../id/persiapan";

// Pilihan istilah domain (dijaga konsisten di seluruh area):
// - kisi-kisi -> "test blueprint"; butir (soal) -> "item"; materi ajar -> "course material"
// - Taksonomi Bloom -> "Bloom's Taxonomy"; debat multi-agen -> "multi-agent debate"
// - Penyusun / Kritikus / Penjawab Buta / Arbiter -> Drafter / Critic / Blind Answerer / Arbiter
// - ronde -> "round"; butir tertunda -> "pending items"; butir ditandai -> "flagged items"
// - potongan materi -> "material chunk"; generasi -> "generation"
const persiapan: typeof id = {
  umum: {
    hapus: "Delete",
  },
  materi: {
    judul: "Course Material",
    deskripsi:
      "Curriculum references and learning materials used as the source for writing test items.",
    formatTidakDidukung:
      "Unsupported file format. Use PDF, DOCX, TXT, or MD.",
    ukuranMelebihi: (mb: number) => `File size exceeds the ${mb} MB limit.`,
    pilihBerkasDulu: "Please choose a material file first.",
    gagalUnggah: "Failed to upload the material.",
    unggah: {
      judul: "Upload New Material",
      keterangan:
        "The material text will be split semantically to serve as context for the AI agents.",
      labelJudul: "Learning Material Title",
      placeholderJudul: "Example: Chapter 3 - Dynamics of Motion and Newton's Laws",
      bantuanJudul: "Enter a specific, clear chapter or topic name",
      labelBerkas: "Material File",
      lepasDiZona: "Drop to select this file",
      lepasDiHalaman: "Drop the file anywhere on this page",
      klikAtauSeret: "Click to choose a file or drag it here",
      formatBerkas: (mb: number) =>
        `File format: PDF (.pdf), Word (.docx), Text (.txt, .md) UTF-8 · max ${mb} MB`,
      catatanKonversi:
        "PDF and DOCX files are automatically converted to Markdown deterministically before being indexed into material chunks.",
      menyimpan: "Saving File...",
      tombolUnggah: "Upload & Save Material",
    },
    daftar: {
      judul: "Registered Materials",
      jumlahDokumen: (n: number) => `${n} ${n === 1 ? "document" : "documents"} saved`,
      kosongJudul: "No learning materials yet",
      kosongDeskripsi:
        "Upload your first material using the form above to start building test blueprints and items.",
      kolomJudul: "Material Title",
      kolomTanggal: "Upload Date",
      kolomAksi: "Actions",
      navigasiHalaman: "Registered materials pagination",
      rentang: (awal: number, akhir: number, total: number) => `Showing ${awal}–${akhir} of ${total}`,
      halaman: (saat: number, total: number) => `Page ${saat} of ${total}`,
      sebelumnya: "Previous",
      berikutnya: "Next",
    },
    hapusDialog: {
      judul: "Delete Course Material",
      deskripsi: (judul: string | undefined) =>
        `The material "${judul}" and all of its text chunks will be permanently deleted. This action cannot be undone.`,
      konfirmasi: "Delete Permanently",
    },
  },
  kisiKisi: {
    judul: "Design Test Blueprint",
    deskripsi:
      "Technical specification of the Bloom's Taxonomy cognitive proportions and the source materials for exam items.",
    bloom: {
      C1: "Remember",
      C2: "Understand",
      C3: "Apply",
      C4: "Analyze",
      C5: "Evaluate",
      C6: "Create",
    },
    pesan: {
      totalBloom: (total: number) =>
        `The Bloom distribution must total exactly 100% (currently ${total}%).`,
      pilihMateri: "Select at least one course material as a reference.",
      rentangButir: "The number of items must be between 1 and 50.",
      gagalSimpan: "Failed to save the test blueprint.",
      perubahanDisimpan: "Test blueprint changes saved.",
      disimpanSebagaiDraf:
        "Test blueprint saved as a draft. Start the debate anytime from the list below.",
      dihapus: "Test blueprint deleted.",
      aksiGagal: "The action could not be completed.",
    },
    sedangMengubah:
      "You are editing a saved test blueprint. Changes take effect once saved.",
    batalUbah: "Cancel edit",
    materiRujukan: {
      label: "Reference Learning Materials",
      keterangan:
        "Select one or more material documents to serve as the basis for item extraction.",
      kosong: "No course materials registered yet.",
      linkUnggah: "Upload a material document first",
      navigasiHalaman: "Reference learning materials pagination",
      rentang: (awal: number, akhir: number, total: number) => `Showing ${awal}–${akhir} of ${total}`,
      halaman: (saat: number, total: number) => `Page ${saat} of ${total}`,
      sebelumnya: "Previous",
      berikutnya: "Next",
    },
    jumlahButir: {
      label: "Target Number of Items",
      bantuan: "5–15 items per deliberative review cycle is recommended",
    },
    distribusi: {
      label: "Bloom Cognitive Level Distribution (%)",
      keterangan:
        "Weight of items from basic levels up to higher-order thinking skills (HOTS)",
      kosongkanSemua: "Clear all",
      total: "Total:",
      totalTidakPas: (total: number) =>
        `The current distribution totals ${total}%. It must be exactly 100% to continue.`,
    },
    opsional: {
      labelNama: "Test Blueprint Name (Optional)",
      placeholderNama: "E.g. Blueprint A, or Grade 10 Physics Midterm",
      bantuanNama:
        "Used as the item group title in the Item Bank and Exam Builder. If empty, the material title is used",
      labelCakupan: "Chapter Scope & Indicator Focus (Optional)",
      placeholderCakupan:
        "E.g. Focus on Newton's Second Law and its application on inclined planes...",
      bantuanCakupan:
        "Keywords are used to select relevant material chunks, then passed to the Drafter Agent as the item focus",
    },
    tombol: {
      menyimpan: "Saving...",
      simpanPerubahan: "Save Changes",
      simpan: "Save Test Blueprint",
      catatanDebat:
        "The debate starts from the Saved Test Blueprints list below, not automatically.",
    },
    tersimpan: {
      judul: "Saved Test Blueprints",
      jumlah: (n: number) => `${n} ${n === 1 ? "blueprint" : "blueprints"}`,
      kosong:
        "No test blueprints yet. Save one above; drafts that haven't been run can be edited or deleted.",
      tanpaMateri: "No material",
      materi: "Material:",
      targetAwal: "Target",
      targetAkhir: "items",
      butirDibuat: "items created",
      cakupan: "Scope:",
      mulaiGenerasi: "Start Generation",
      ubah: "Edit",
      lihatProgres: "View Progress",
      navigasiHalaman: "Saved blueprints pagination",
      rentang: (awal: number, akhir: number, total: number) => `Showing ${awal}–${akhir} of ${total}`,
      halaman: (saat: number, total: number) => `Page ${saat} of ${total}`,
      sebelumnya: "Previous",
      berikutnya: "Next",
    },
    dialogMulai: {
      judul: "Start Multi-Agent Debate",
      deskripsi:
        "This test blueprint will be run now. Once started, it can no longer be edited or deleted.",
      konfirmasi: "Start Generation",
      jumlahTarget: "Target number of items",
      materiRujukan: "Reference materials",
    },
    dialogHapus: {
      judul: "Delete Test Blueprint",
      deskripsi:
        "This draft test blueprint will be permanently deleted. The course materials are not deleted.",
      konfirmasi: "Delete",
    },
    cakupan: {
      cocok: (cocok: number, total: number) =>
        `The scope matches ${cocok} of ${total} material chunks; items are created from those chunks.`,
      tidakCocok: (kataKunci: string) =>
        `The scope was not found in the material (keywords: ${kataKunci}). All of the material will be used.`,
    },
  },
  generasi: {
    judul: "Multi-Agent Debate Progress",
    deskripsi:
      "A deliberation simulation of four AI agents (Drafter, Critic, Blind Answerer, Arbiter) to test the validity of each item.",
    butirDitandai: "Flagged Items",
    bukaBankSoal: "Open Item Bank",
    memuat: "Loading progress...",
    belumDijalankan: {
      judul: "This test blueprint hasn't been run yet",
      deskripsi:
        "The debate starts from the Saved Test Blueprints list, so you can pick the right blueprint before the agents begin working.",
      tombol: "Open Saved Test Blueprints",
    },
    mempersiapkan: {
      judul: "Preparing Items...",
      deskripsi:
        "The system is preparing items for debate. If another generation is still running, this one will wait its turn.",
      menunggu: "Waiting in queue...",
    },
    progres: {
      diproses: (n: number, total: number) =>
        `${n} of ${total} items processed`,
      sinkronisasi: "Syncing live...",
      selesai: "✓ Done",
      catatanLatarBelakang:
        "The 4-agent AI deliberation runs in the background on the server. You can navigate away or leave this page safely without losing progress. A button back to the debate will appear in the top bar if you move to another page.",
      tertundaAwal: (n: number) => `${n} ${n === 1 ? "item is" : "items are"}`,
      tertundaKata: "pending",
      tertundaAkhir:
        "due to agent call issues. If there are pending items, go to the Pending Items page and retry them.",
      bukaButirTertunda: "Open Pending Items",
    },
    tabel: {
      bloom: "Bloom",
      status: "Status",
      ronde: "Round",
      keteranganNaskah: "Item Text",
      debat: "Debate",
      menungguGiliran: "Waiting for the agents' review turn...",
      lihatDebatLive: "View live debate",
    },
    kisi: {
      ariaLabel: "Test blueprint being debated",
      judul: "Test Blueprint Being Debated",
      nama: "Name",
      tanpaNama: "Untitled",
      jumlahButir: "Number of items",
      materiRujukan: "Reference materials",
      tanpaMateri: "No material",
      cakupanBab: "Chapter scope",
      distribusiBloom: "Bloom Distribution",
    },
  },
};

export default persiapan;
