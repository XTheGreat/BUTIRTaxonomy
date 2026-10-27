export function BagianKepala({ judul, keterangan }: { judul: string; keterangan?: string }) {
  return (
    <header className="border-b border-[var(--line)] pb-4">
      <h3 className="font-serif text-xl font-normal text-[var(--ink)]">{judul}</h3>
      {keterangan && <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{keterangan}</p>}
    </header>
  );
}

export function Subjudul({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h4 id={id} className="font-serif text-base font-normal text-[var(--ink)]">
      {children}
    </h4>
  );
}
