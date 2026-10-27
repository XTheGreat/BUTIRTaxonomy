import type galatInstitusiId from "../id/galatInstitusi";

const galatInstitusi: typeof galatInstitusiId = {
  institusi_tidak_ditemukan: "Institution not found",
  institusi_akun_belum_terdaftar: "No account with that email is registered yet. Ask the teacher to sign up first.",
  institusi_akun_sudah_anggota_lain: "That account is already a member of another institution",
  institusi_akun_sudah_anggota_ini: "That account is already a member of this institution",
  institusi_kursi_kurang_dari_anggota: "Seats cannot be fewer than the current number of members",
  institusi_hanya_admin_tambah_anggota: "Only institution admins can add members",
  institusi_lisensi_tidak_aktif: "The institution's license is not active",
  institusi_kursi_penuh: (p) => `All seats are taken (${p.kursi}). Add license seats to add more members.`,
  institusi_hanya_admin_keluarkan_anggota: "Only institution admins can remove members",
  institusi_anggota_tidak_ditemukan: "Member not found in this institution",
  institusi_admin_hanya_oleh_admin_sistem: "An institution admin can only be removed by a system admin",
  marketplace_soal_arsip_tak_dijual: "Questions from the Archive cannot be sold on the Marketplace.",
  marketplace_butir_tak_boleh_dijual:
    "Only accepted items that you own can be sold. Please check your item selection again.",
  marketplace_listing_tidak_ditemukan: "Listing not found",
  marketplace_listing_tidak_dijual: "Listing not found or no longer for sale",
  marketplace_beli_milik_sendiri: "You cannot buy your own question bank",
  marketplace_sudah_dibeli: "You have already bought, or are still processing the purchase of, this question bank",
  marketplace_transaksi_tidak_ditemukan: "Transaction not found",
  marketplace_transaksi_sudah_berstatus: (p) => `The transaction is already ${p.status}`,
};

export default galatInstitusi;
