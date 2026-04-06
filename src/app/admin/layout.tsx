import type { Metadata } from "next";
import { AdminShell } from "./admin-shell";

// Override manifest สำหรับ admin ใน server-rendered HTML
// iOS Safari อ่าน <link rel="manifest"> จาก SSR — ต้องเป็น server component เท่านั้น
export const metadata: Metadata = {
  manifest: "/api/admin-manifest",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
