"use client";

import { useState } from "react";
import { Bell, Coffee } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminBottomNav } from "@/components/admin/bottom-nav";
import { NewOrderAlert } from "@/components/admin/new-order-alert";
import { useAuthStore } from "@/store/auth";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuthStore();
  const pathname = usePathname();

  const isLoginPage = pathname === "/admin/login";
  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar mobileOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-border px-4 h-14 flex items-center gap-3 flex-shrink-0">
          {/* Mobile: shop icon instead of hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">ช่วงเวลาคาเฟ่</span>
          </div>

          <div className="flex-1" />

          <button className="relative p-2 rounded-xl hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? "A"}
            </div>
            <span className="text-sm font-medium hidden sm:block">{user?.name ?? "Admin"}</span>
          </div>
        </header>

        {/* Main content — add bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 bg-slate-50">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <AdminBottomNav onMoreClick={() => setDrawerOpen(true)} />

      {/* Persistent new order alert — works across all admin pages */}
      <NewOrderAlert />
    </div>
  );
}
