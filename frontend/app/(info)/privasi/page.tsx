import type { Metadata } from "next";
import PrivasiIsi from "./PrivasiIsi";

export const metadata: Metadata = { title: "Kebijakan Privasi - BUTIR" };

export default function PrivasiPage() {
  return <PrivasiIsi />;
}
