import type { Metadata } from "next";
import SyaratIsi from "./SyaratIsi";

export const metadata: Metadata = { title: "Syarat Penggunaan - BUTIR" };

export default function SyaratPage() {
  return <SyaratIsi />;
}
