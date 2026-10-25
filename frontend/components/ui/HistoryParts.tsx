import { HistoryDebatTerakhir } from "@/lib/types";
import { WARNA_GRAFIK } from "@/lib/warnaGrafik";

export const STATUS_HISTORY: { key: string; label: string; warna: string; penanda: string }[] = [
  { key: "diterima", label: "Diterima", warna: "#1F6B3A", penanda: WARNA_GRAFIK.diterima },
  { key: "ditandai", label: "Ditandai", warna: "#8A5A00", penanda: WARNA_GRAFIK.ditandai },
  { key: "ditolak", label: "Ditolak", warna: "#A4262C", penanda: WARNA_GRAFIK.ditolak },
  { key: "tertunda", label: "Tertunda", warna: "#5A6070", penanda: WARNA_GRAFIK.tertunda },
];

const MAX_RONDE = 3;

export function warnaStatus(status: string): string {
  return STATUS_HISTORY.find((s) => s.key === status)?.warna ?? "#5A6070";
}

export function warnaPenanda(status: string): string {
  return STATUS_HISTORY.find((s) => s.key === status)?.penanda ?? WARNA_GRAFIK.tertunda;
}

export function Kotak({
  warna,
  kosong = false,
  className = "",
}: {
  warna: string;
  kosong?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-2 h-2 shrink-0 border ${className}`}
      style={{
        borderColor: warna,
        backgroundColor: kosong ? "transparent" : warna,
      }}
    />
  );
}

export function PipRonde({ ronde }: { ronde: number }) {
  return (
    <span
      className="inline-flex items-center gap-[3px] shrink-0"
      aria-label={`Ronde ${ronde} dari ${MAX_RONDE}`}
    >
      {Array.from({ length: MAX_RONDE }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full border ${
            i < ronde
              ? "bg-[var(--accent)] border-[var(--accent)]"
              : "bg-transparent border-[var(--line-strong)]"
          }`}
        />
      ))}
    </span>
  );
}

export function RingkasanStatus({
  hitung,
  total,
  ukuranTeks = "text-[10px]",
}: {
  hitung: HistoryDebatTerakhir["hitung"];
  total: number;
  ukuranTeks?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className="flex h-1.5 w-full gap-px bg-[var(--line)]"
        role="img"
        aria-label={STATUS_HISTORY.map((s) => `${hitung[s.key] ?? 0} ${s.label}`).join(", ")}
      >
        {STATUS_HISTORY.map((s) => {
          const n = hitung[s.key] ?? 0;
          if (n === 0 || total === 0) return null;
          return (
            <span
              key={s.key}
              style={{ flexGrow: n, backgroundColor: s.penanda }}
              className="h-full"
            />
          );
        })}
      </div>
      <ul className={`flex flex-wrap gap-x-3 gap-y-0.5 font-sans ${ukuranTeks}`}>
        {STATUS_HISTORY.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1 text-[var(--ink-muted)]">
            <Kotak warna={s.penanda} kosong={s.key === "tertunda"} className="!w-1.5 !h-1.5" />
            <span className="tabular-nums font-semibold" style={{ color: s.warna }}>
              {hitung[s.key] ?? 0}
            </span>
            <span>{s.label.toLowerCase()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
