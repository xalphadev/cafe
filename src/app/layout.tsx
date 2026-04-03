import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import { Providers } from "@/components/shared/providers";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ช่วงเวลาคาเฟ่",
    template: "%s | ช่วงเวลาคาเฟ่",
  },
  description: "สั่งเครื่องดื่มและอาหารส่งถึงบ้าน สะดวก รวดเร็ว",
  appleWebApp: { capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2e7d52",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${kanit.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
