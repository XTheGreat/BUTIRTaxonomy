"use client";

import { useEffect, useRef } from "react";

const SKRIP = "https://accounts.google.com/gsi/client";

type GoogleWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (opsi: { client_id: string; callback: (r: { credential: string }) => void }) => void;
        renderButton: (el: HTMLElement, opsi: Record<string, unknown>) => void;
      };
    };
  };
};

function muatSkrip(): Promise<void> {
  return new Promise((selesai, gagal) => {
    if ((window as GoogleWindow).google?.accounts) return selesai();
    const ada = document.querySelector<HTMLScriptElement>(`script[src="${SKRIP}"]`);
    const skrip = ada ?? document.createElement("script");
    skrip.addEventListener("load", () => selesai());
    skrip.addEventListener("error", () => gagal(new Error("Skrip Google gagal dimuat")));
    if (!ada) {
      skrip.src = SKRIP;
      skrip.async = true;
      document.head.appendChild(skrip);
    }
  });
}

export default function TombolGoogle({
  clientId,
  onCredential,
  onGagal,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  onGagal: (pesan: string) => void;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const gagalRef = useRef(onGagal);

  useEffect(() => {
    callback.current = onCredential;
    gagalRef.current = onGagal;
  });

  useEffect(() => {
    let aktif = true;
    muatSkrip()
      .then(() => {
        const g = (window as GoogleWindow).google;
        if (!aktif || !g || !wadah.current) return;
        g.accounts.id.initialize({ client_id: clientId, callback: (r) => callback.current(r.credential) });
        g.accounts.id.renderButton(wadah.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "id",
          width: Math.min(400, Math.max(200, wadah.current.clientWidth || 320)),
        });
      })
      .catch(() => aktif && gagalRef.current("Tombol Google tidak dapat dimuat. Periksa koneksi, atau masuk dengan email."));
    return () => {
      aktif = false;
    };
  }, [clientId]);

  return <div ref={wadah} className="flex min-h-[44px] w-full justify-center" />;
}
