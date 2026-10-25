"use client";

import React, { useEffect, useRef, useState } from "react";
import { DAFTAR_FAKTA } from "@/lib/faktaUnik";

interface ItemFakta {
  id: number;
  teks: string;
  topPercent: number;
  delayAwal: number;
}

// Kecepatan seragam dan konstan untuk semua fakta (32 detik dari kanan ke kiri)
const DURASI_TETAP = 32;

// 3 Zona ketinggian: Atas, Tengah, dan Bawah
const ZONA = [
  { nama: "atas", topPercent: 22 },
  { nama: "tengah", topPercent: 50 },
  { nama: "bawah", topPercent: 78 },
] as const;

// Item awal terdistribusi di 3 zona dengan offset berbeda agar langsung hidup saat dimuat
const ITEMS_AWAL: ItemFakta[] = [
  { id: 1, teks: DAFTAR_FAKTA[0], topPercent: ZONA[0].topPercent, delayAwal: -18 },
  { id: 2, teks: DAFTAR_FAKTA[1], topPercent: ZONA[1].topPercent, delayAwal: -26 },
  { id: 3, teks: DAFTAR_FAKTA[2], topPercent: ZONA[1].topPercent, delayAwal: -8 },
  { id: 4, teks: DAFTAR_FAKTA[3], topPercent: ZONA[2].topPercent, delayAwal: -14 },
  { id: 5, teks: DAFTAR_FAKTA[4], topPercent: ZONA[2].topPercent, delayAwal: 0 },
];

export default function FaktaUnikBerjalan() {
  const [items, setItems] = useState<ItemFakta[]>(ITEMS_AWAL);
  const idCounter = useRef(6);
  const riwayatFakta = useRef<number[]>([0, 1, 2, 3, 4]);

  useEffect(() => {
    let dibatalkan = false;
    const timerList: NodeJS.Timeout[] = [];

    // Mengambil fakta acak dari koleksi tanpa pengulangan langsung
    function ambilFaktaAcak(): string {
      let index: number;
      let percobaan = 0;
      do {
        index = Math.floor(Math.random() * DAFTAR_FAKTA.length);
        percobaan++;
      } while (riwayatFakta.current.includes(index) && percobaan < 35);

      riwayatFakta.current.push(index);
      if (riwayatFakta.current.length > 30) {
        riwayatFakta.current.shift();
      }
      return DAFTAR_FAKTA[index];
    }

    function buatItem(topPercent: number): ItemFakta {
      return {
        id: idCounter.current++,
        teks: ambilFaktaAcak(),
        topPercent,
        delayAwal: 0,
      };
    }

    // Loop pemunculan acak terpisah untuk masing-masing dari 3 zona
    ZONA.forEach((zona) => {
      function jadwalkanDiZona() {
        // Jeda acak antar-fakta dalam satu zona: 11 hingga 17 detik
        // Karena durasi perjalanan 32 detik, jarak jeda ini menjamin tidak akan pernah saling menindih
        const jeda = Math.floor(Math.random() * 6000) + 11000;

        const t = setTimeout(() => {
          if (dibatalkan) return;

          setItems((prev) => {
            // Batasi maksimal item per zona untuk menjaga performa
            const jumlahDiZona = prev.filter((i) => i.topPercent === zona.topPercent).length;
            if (jumlahDiZona >= 3) return prev;
            return [...prev, buatItem(zona.topPercent)];
          });

          jadwalkanDiZona();
        }, jeda);

        timerList.push(t);
      }

      // Berikan offset awal acak untuk setiap zona agar waktu kedatangan berikutnya tidak bersamaan
      const offsetAwal = Math.floor(Math.random() * 4000) + 4000;
      const tAwal = setTimeout(() => {
        if (!dibatalkan) jadwalkanDiZona();
      }, offsetAwal);
      timerList.push(tAwal);
    });

    return () => {
      dibatalkan = true;
      timerList.forEach((t) => clearTimeout(t));
    };
  }, []);

  function handleAnimationEnd(id: number) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_48px,black_calc(100%-48px),transparent)] select-none"
      aria-label="Fakta Pengetahuan Berjalan"
    >
      {/* Render teks fakta murni tanpa border dan tanpa background */}
      {items.map((item) => (
        <p
          key={item.id}
          onAnimationEnd={() => handleAnimationEnd(item.id)}
          style={{
            top: `${item.topPercent}%`,
            animation: `jalanKeKiri ${DURASI_TETAP}s linear forwards`,
            animationDelay: `${item.delayAwal}s`,
            willChange: "left, transform",
          }}
          className="absolute whitespace-nowrap font-serif text-sm sm:text-base text-[var(--ink)] tracking-normal cursor-default transition-colors duration-150 hover:text-[var(--accent)] hover:[animation-play-state:paused]"
        >
          {item.teks}
        </p>
      ))}
    </div>
  );
}
