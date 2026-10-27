import type id from "../id/akun";

const akun: typeof id = {
  profil: {
    menu: "Profile menu",
    pengajarDefault: "Teacher",
    emailDefault: "email@institution.id",
    pengaturan: "Settings",
    keluar: "Sign out",
  },
  pengaturan: {
    judul: "Settings",
    deskripsi: "Manage your account information and working session.",
    akun: {
      judul: "Account",
      nama: "Name",
      email: "Email",
      peran: "Role",
      peranGuru: "Teacher",
      peranAdmin: "Admin",
      bantuan: "Changing your name and email is not available from this page yet.",
    },
    bahasa: {
      judul: "Language",
      keterangan: "Choose the interface language.",
      indonesia: "Bahasa Indonesia",
      inggris: "English",
      catatan: "Translation is rolling out in stages, so some pages are still shown in Indonesian.",
    },
    sesi: {
      judul: "Session",
      keterangan: "Sign out of this device. You will need to sign in again to continue.",
      keluar: "Sign out",
    },
  },
};

export default akun;
