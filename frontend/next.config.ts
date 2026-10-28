import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Folder keluaran bisa diganti lewat NEXT_DIST_DIR agar build uji (mis. Lighthouse)
  // tidak menimpa .next yang dipakai `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // 40 dipakai tekstur latar login (hanya tampil pada opasitas 16%); 75 untuk sisanya.
    qualities: [40, 75],
  },
};

export default nextConfig;
