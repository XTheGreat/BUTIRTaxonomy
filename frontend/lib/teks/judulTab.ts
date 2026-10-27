import { useEffect } from "react";

// Mengatur judul tab untuk halaman yang judulnya berasal dari kamus. Next menulis ulang
// <title> setelah metadata server selesai dimuat, jadi judul dijaga selama halaman aktif.
export function useJudulTab(judul: string) {
  useEffect(() => {
    const terapkan = () => {
      if (document.title !== judul) document.title = judul;
    };
    terapkan();
    const pengamat = new MutationObserver(terapkan);
    pengamat.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => pengamat.disconnect();
  }, [judul]);
}
