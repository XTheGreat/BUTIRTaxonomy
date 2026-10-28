// Palet grafik ala aplikasi trading (lihat DESIGN.md). Nilainya tetap dan tidak ikut berganti
// saat tema terang/gelap berubah: hijau tetap hijau, merah tetap merah, sehingga arti lilin
// naik/turun dan status keputusan tidak bergeser. Jangan diganti dengan variabel tema.
export const WARNA_GRAFIK = {
  naik: "#0ECB81",
  turun: "#F6465D",
  diterima: "#0ECB81",
  ditandai: "#F0B90B",
  ditolak: "#F6465D",
  tertunda: "#848E9C",
  biru: "#2F6B8A",
} as const;
