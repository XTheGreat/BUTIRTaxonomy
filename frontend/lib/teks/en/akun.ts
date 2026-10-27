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
      bantuan: "Changing your email requires your current password.",
      passwordSekarang: "Current password",
      simpan: "Save changes",
      menyimpan: "Saving...",
      tersimpan: "Changes saved.",
      tanpaPerubahan: "Nothing has changed yet.",
      gagal: "Could not save your changes.",
    },
    password: {
      judul: "Password",
      keterangan: "Change your account password.",
      passwordSekarang: "Current password",
      passwordBaru: "New password",
      bantuanBaru: "At least 8 characters, combining letters and numbers",
      simpan: "Change password",
      menyimpan: "Saving...",
      berhasil: "Password changed successfully.",
      gagal: "Could not change your password.",
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
