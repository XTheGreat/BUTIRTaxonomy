"use client";

import { useEffect, useRef } from "react";
import { useBahasa, useTeks } from "@/lib/teks";

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

function muatSkrip(pesanGagal: string): Promise<void> {
  return new Promise((selesai, gagal) => {
    if ((window as GoogleWindow).google?.accounts) return selesai();
    const ada = document.querySelector<HTMLScriptElement>(`script[src="${SKRIP}"]`);
    const skrip = ada ?? document.createElement("script");
    skrip.addEventListener("load", () => selesai());
    skrip.addEventListener("error", () => gagal(new Error(pesanGagal)));
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
  const t = useTeks();
  const { bahasa } = useBahasa();
  const pesanSkripGagal = t.auth.tombolGoogle.skripGagal;
  const pesanTidakDapatDimuat = t.auth.tombolGoogle.tidakDapatDimuat;
  const wadah = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const gagalRef = useRef(onGagal);

  useEffect(() => {
    callback.current = onCredential;
    gagalRef.current = onGagal;
  });

  useEffect(() => {
    let aktif = true;
    muatSkrip(pesanSkripGagal)
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
          locale: bahasa,
          width: Math.min(400, Math.max(200, wadah.current.clientWidth || 320)),
        });
      })
      .catch(() => aktif && gagalRef.current(pesanTidakDapatDimuat));
    return () => {
      aktif = false;
    };
  }, [clientId, bahasa, pesanSkripGagal, pesanTidakDapatDimuat]);

  return <div ref={wadah} className="flex min-h-[44px] w-full justify-center" />;
}
