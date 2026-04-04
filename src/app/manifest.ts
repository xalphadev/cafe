import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ช่วงเวลาคาเฟ่",
    short_name: "คาเฟ่",
    description: "สั่งเครื่องดื่มสดใหม่ รับหน้าร้านได้เลย",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1ebe6e",
    categories: ["food", "shopping"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
