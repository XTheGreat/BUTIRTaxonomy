import type { Metadata } from "next";
import PanduanIsi from "./PanduanIsi";

export const metadata: Metadata = { title: "Panduan Penggunaan - BUTIR" };

export default function PanduanPage() {
  return <PanduanIsi />;
}
