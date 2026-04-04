"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, UtensilsCrossed, ClipboardList, User } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";

const primary    = "oklch(0.69 0.21 152)";
const primaryXlt = "oklch(0.93 0.07 152)";
const fgMuted    = "oklch(0.55 0.04 148)";

export function BottomNav() {
  const pathname  = usePathname();
  const itemCount = useCartStore(s => s.itemCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Hide on focused flows — cart, checkout, payment
  const isHidden = pathname === "/cart" || pathname === "/checkout" || pathname.endsWith("/payment");
  if (isHidden) return null;

  const navItems = [
    { href: "/home",    label: "หน้าแรก", icon: Home,           badge: false },
    { href: "/menu",    label: "เมนู",     icon: UtensilsCrossed, badge: true  },
    { href: "/orders",  label: "ออเดอร์",  icon: ClipboardList,  badge: false },
    { href: "/profile", label: "โปรไฟล์",  icon: User,           badge: false },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "oklch(1 0 0 / 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid oklch(0.93 0.012 152)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 16px oklch(0.62 0.20 152 / 0.08)",
      }}
    >
      <div className="max-w-lg mx-auto flex">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href ||
            (href === "/orders" && pathname.startsWith("/orders")) ||
            (href === "/profile" && pathname.startsWith("/profile"));

          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2.5 gap-1 relative">
              {/* Active top bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                  style={{ background: primary }} />
              )}

              <div className="relative">
                {isActive && (
                  <span className="absolute inset-0 rounded-xl -m-1.5" style={{ background: primaryXlt }} />
                )}
                <Icon
                  className={cn("w-5.5 h-5.5 relative z-10 transition-all", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? primary : fgMuted }}
                />
                {mounted && badge && itemCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 text-[9px] font-extrabold rounded-full flex items-center justify-center px-1 z-20"
                    style={{ background: "oklch(0.58 0.22 25)", color: "white" }}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </div>

              <span className="text-[10px] font-semibold" style={{ color: isActive ? primary : fgMuted }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
