"use client";

import { useEffect, useRef } from "react";

const UKURAN = 36;
const SKALA_DIAM = 24 / UKURAN;
const KELEMBUTAN = 0.2;

export default function KursorLingkaran() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tujuanX = 0;
    let tujuanY = 0;
    let x = 0;
    let y = 0;
    let terlihat = false;
    let frame = 0;
    let jedaGulir: ReturnType<typeof setTimeout> | undefined;

    const gambar = () => {
      el.style.translate = `${x - UKURAN / 2}px ${y - UKURAN / 2}px`;
    };

    const putar = () => {
      x += (tujuanX - x) * KELEMBUTAN;
      y += (tujuanY - y) * KELEMBUTAN;
      gambar();
      if (Math.abs(tujuanX - x) > 0.1 || Math.abs(tujuanY - y) > 0.1) {
        frame = requestAnimationFrame(putar);
      } else {
        frame = 0;
      }
    };

    const tampil = (nilai: boolean) => {
      terlihat = nilai;
      el.style.opacity = nilai ? "1" : "0";
    };

    const gerak = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tujuanX = e.clientX;
      tujuanY = e.clientY;
      if (!terlihat) {
        x = tujuanX;
        y = tujuanY;
        gambar();
        tampil(true);
      }
      if (kurangiGerak) {
        x = tujuanX;
        y = tujuanY;
        gambar();
      } else if (!frame) {
        frame = requestAnimationFrame(putar);
      }
    };

    const gulir = () => {
      if (!terlihat) return;
      el.style.visibility = "hidden";
      clearTimeout(jedaGulir);
      jedaGulir = setTimeout(() => {
        el.style.visibility = "visible";
      }, 160);
    };

    const tekan = () => {
      el.style.scale = "1";
    };
    const lepas = () => {
      el.style.scale = String(SKALA_DIAM);
    };

    const keluar = () => {
      tampil(false);
      lepas();
    };
    const masuk = () => {
      if (terlihat === false && (tujuanX || tujuanY)) tampil(true);
    };

    window.addEventListener("pointermove", gerak, { passive: true });
    window.addEventListener("scroll", gulir, { capture: true, passive: true });
    window.addEventListener("wheel", gulir, { passive: true });
    window.addEventListener("pointerdown", tekan);
    window.addEventListener("pointerup", lepas);
    window.addEventListener("pointercancel", lepas);
    document.documentElement.addEventListener("mouseleave", keluar);
    document.documentElement.addEventListener("mouseenter", masuk);
    window.addEventListener("blur", keluar);

    return () => {
      window.removeEventListener("pointermove", gerak);
      window.removeEventListener("scroll", gulir, { capture: true });
      window.removeEventListener("wheel", gulir);
      clearTimeout(jedaGulir);
      window.removeEventListener("pointerdown", tekan);
      window.removeEventListener("pointerup", lepas);
      window.removeEventListener("pointercancel", lepas);
      document.documentElement.removeEventListener("mouseleave", keluar);
      document.documentElement.removeEventListener("mouseenter", masuk);
      window.removeEventListener("blur", keluar);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full bg-white"
      style={{
        width: UKURAN,
        height: UKURAN,
        opacity: 0,
        scale: String(SKALA_DIAM),
        mixBlendMode: "difference",
        willChange: "translate, scale",
        transition: "opacity 150ms ease-out, scale 140ms ease-out",
      }}
    />
  );
}
