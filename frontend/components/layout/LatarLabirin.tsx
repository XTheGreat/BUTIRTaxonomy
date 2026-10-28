import Image from "next/image";

// Tekstur latar hanya terlihat pada opasitas 16%, jadi kualitasnya diturunkan. Lewat next/image
// berkas 433 KB ini dikirim sebagai WebP/AVIF seukuran layar, dan priority membuatnya
// ditemukan sejak HTML awal (bukan setelah CSS selesai diurai).
export default function LatarLabirin() {
  return (
    <Image
      src="/latar-labirin.jpg"
      alt=""
      fill
      priority
      sizes="100vw"
      quality={40}
      aria-hidden="true"
      className="pointer-events-none object-cover object-center opacity-[0.16] mix-blend-multiply"
    />
  );
}
