import type { Metadata } from "next";
import TentangIsi from "./TentangIsi";

export const metadata: Metadata = { title: "Tentang - BUTIR" };

export default function TentangPage() {
  return <TentangIsi />;
}
