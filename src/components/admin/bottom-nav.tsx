"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/admin/orders",    label: "ออเดอร์",  icon: ShoppingBag },
  { href: "/admin/products",  label: "สินค้า",   icon: Package },
];

export function AdminBottomNav({ onMoreClick }: { onMoreClick: () => void }) {
  const pathname = usePathname();

  const primaryPaths = NAV_ITEMS.map((i) => i.href);
  const isMore = !primaryPaths.some((p) => pathname === p || (p !== "/admin/dashboard" && pathname.startsWith(p)));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-slate-900 border-t border-slate-700 flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
              isActive ? "text-primary" : "text-slate-400"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
      <button
        onClick={onMoreClick}
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
          isMore ? "text-primary" : "text-slate-400"
        )}
      >
        <MoreHorizontal className="w-5 h-5" />
        <span className="text-[10px] font-medium">เพิ่มเติม</span>
      </button>
    </nav>
  );
}
