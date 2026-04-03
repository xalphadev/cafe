"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Package, Grid3X3, Users,
  Star, Tag, BarChart3, LogOut, X, ImagePlay, Settings, Coffee,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const navGroups = [
  {
    label: "ภาพรวม",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "จัดการออเดอร์", icon: ShoppingBag },
    ],
  },
  {
    label: "สินค้า",
    items: [
      { href: "/admin/products", label: "สินค้า", icon: Package },
      { href: "/admin/categories", label: "หมวดหมู่", icon: Grid3X3 },
      { href: "/admin/banners", label: "แบนเนอร์", icon: ImagePlay },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/admin/crm", label: "ลูกค้า", icon: Users },
      { href: "/admin/crm/loyalty", label: "Loyalty Points", icon: Star },
      { href: "/admin/crm/coupons", label: "คูปอง", icon: Tag },
    ],
  },
  {
    label: "รายงาน",
    items: [
      { href: "/admin/reports", label: "รายงานยอดขาย", icon: BarChart3 },
      { href: "/admin/settings", label: "ตั้งค่าร้าน", icon: Settings },
    ],
  },
];

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace("/admin/login");
  };

  const content = (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
          <Coffee className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">ช่วงเวลาคาเฟ่</p>
          <p className="text-[10px] text-slate-400">Admin Panel</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-1.5">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-slate-300 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-60 flex-shrink-0 h-screen sticky top-0">{content}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="absolute left-0 top-0 bottom-0 w-64">{content}</div>
        </div>
      )}
    </>
  );
}
