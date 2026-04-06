"use client";

import { useState, useEffect } from "react";
import { Coffee } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminBottomNav } from "@/components/admin/bottom-nav";
import { NewOrderAlert, unlockAudio } from "@/components/admin/new-order-alert";
import { AdminPushButton } from "@/components/admin/push-button";
import { useAuthStore } from "@/store/auth";
import { usePathname } from "next/navigation";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ปลดล็อก AudioContext ตอน user แตะหน้าจอครั้งแรก (iOS บังคับ)
  useEffect(() => {
    const unlock = () => { unlockAudio(); document.removeEventListener("touchstart", unlock); };
    document.addEventListener("touchstart", unlock, { once: true });
    return () => document.removeEventListener("touchstart", unlock);
  }, []);
  const { user } = useAuthStore();
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";
  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar mobileOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-border px-4 h-14 flex items-center gap-3 flex-shrink-0">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">ช่วงเวลาคาเฟ่</span>
          </div>

          <div className="flex-1" />

          <AdminPushButton />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name ?? "Admin"}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 bg-slate-50">
          {children}
        </main>
      </div>

      <AdminBottomNav onMoreClick={() => setDrawerOpen(true)} />
      <NewOrderAlert />
    </div>
  );
}
