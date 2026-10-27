import "./globals.css";
import { Metadata } from "next";
import Script from "next/script";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import KursorLingkaran from "@/components/ui/KursorLingkaran";
import PenerapTampilan from "@/components/pengaturan/PenerapTampilan";
import { BahasaProvider } from "@/lib/teks";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BUTIR - Sistem Validasi Butir Soal",
  description: "Sistem penyusunan dan validasi butir soal ujian via debat multi-agen AI",
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const temaTersimpan = `try{var t=JSON.parse(localStorage.getItem("butir_tampilan")||"null")?.tema;document.documentElement.dataset.tema=t==="gelap"?"gelap":"terang"}catch{document.documentElement.dataset.tema="terang"}`;

  return (
    <html
      lang="id"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-canvas text-ink font-sans antialiased min-h-screen">
        <Script id="terapkan-tema-awal" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: temaTersimpan }} />
        <BahasaProvider>
          {children}
          <KursorLingkaran />
          <PenerapTampilan />
        </BahasaProvider>
      </body>
    </html>
  );
}
