export function GET() {
  const manifest = {
    name: "ช่วงเวลาคาเฟ่ — Admin",
    short_name: "คาเฟ่ Admin",
    description: "จัดการร้าน ดูออเดอร์ และรับแจ้งเตือน",
    start_url: "/admin",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1ebe6e",
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
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache",
    },
  });
}
