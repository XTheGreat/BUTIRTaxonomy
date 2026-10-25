export interface PenyebabRamah {
  judul: string;
  saran: string | null;
}

export function ringkasPenyebab(alasan: string | null | undefined): PenyebabRamah {
  const t = (alasan || "").trim();
  if (!t) return { judul: "Penyebab tidak tercatat", saran: "Coba ulangi butir ini." };
  const k = t.toLowerCase();

  if (k.includes("dihentikan oleh guru")) {
    return { judul: "Dihentikan oleh Anda", saran: "Ulangi bila ingin melanjutkan." };
  }
  if (k.includes("server dimulai ulang")) {
    return { judul: "Proses terputus karena server dimulai ulang", saran: "Ulangi butir ini." };
  }
  if (k.includes("melebihi batas waktu") || k.includes("timeout")) {
    return { judul: "Layanan AI terlalu lama membalas", saran: "Coba ulangi beberapa saat lagi." };
  }
  if (/http (402|403)|menolak permintaan|saldo|kuota|payment|insufficient/.test(k)) {
    return {
      judul: "Saldo atau akses layanan AI bermasalah",
      saran: "Hubungi administrator untuk memeriksa saldo atau kunci layanan, lalu ulangi.",
    };
  }
  if (k.includes("http 401")) {
    return { judul: "Kunci akses layanan AI tidak valid", saran: "Hubungi administrator, lalu ulangi." };
  }
  if (k.includes("http 429") || k.includes("rate limit")) {
    return { judul: "Layanan AI sedang membatasi permintaan", saran: "Tunggu sebentar, lalu ulangi." };
  }
  if (k.includes("terpotong")) {
    return { judul: "Jawaban AI terpotong sebelum selesai", saran: "Ulangi butir ini." };
  }
  if (k.includes("json") || k.includes("skema")) {
    return { judul: "Jawaban AI tidak sesuai format yang diminta", saran: "Ulangi butir ini." };
  }
  if (/http 5\d\d|connect|jaringan|network|read error|remote/.test(k)) {
    return { judul: "Layanan AI tidak dapat dihubungi", saran: "Coba ulangi beberapa saat lagi." };
  }
  return {
    judul: "Pemrosesan butir gagal",
    saran: "Coba ulangi. Bila terus berulang, hubungi administrator.",
  };
}
