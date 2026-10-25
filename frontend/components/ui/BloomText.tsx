import React from "react";

export default function BloomText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\b(C[1-6])\b/).map((bagian, i) =>
        /^C[1-6]$/.test(bagian) ? (
          <span key={i} className="font-semibold text-[var(--accent)]">
            {bagian}
          </span>
        ) : (
          <React.Fragment key={i}>{bagian}</React.Fragment>
        )
      )}
    </>
  );
}
