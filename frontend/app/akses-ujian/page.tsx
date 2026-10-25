import { redirect } from "next/navigation";

export default function MasukUjianPage() {
  redirect("/login?sebagai=siswa");
}
