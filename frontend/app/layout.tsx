import "./globals.css";
import { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import KursorLingkaran from "@/components/ui/KursorLingkaran";
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
  return (
    <html
      lang="id"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-canvas text-ink font-sans antialiased min-h-screen">
        <BahasaProvider>
          {children}
          <KursorLingkaran />
        </BahasaProvider>
      </body>
    </html>
  );
}
