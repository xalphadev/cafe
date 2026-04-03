"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Bike,
  CookingPot,
  PackageCheck,
  CreditCard,
  UtensilsCrossed,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { type OrderWithItems } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  pill: string;
  border: string;
  active: boolean;
  group: "active" | "done" | "cancelled";
}> = {
  PENDING_PAYMENT: {
    label: "รอชำระเงิน",
    icon: <CreditCard className="w-3.5 h-3.5" />,
    pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    border: "#fbbf24",
    active: true,
    group: "active",
  },
  PENDING: {
    label: "รอรับออเดอร์",
    icon: <Clock className="w-3.5 h-3.5" />,
    pill: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
    border: "#fb923c",
    active: true,
    group: "active",
  },
  CONFIRMED: {
    label: "รับออเดอร์แล้ว",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    pill: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    border: "#60a5fa",
    active: true,
    group: "active",
  },
  PREPARING: {
    label: "กำลังเตรียม",
    icon: <CookingPot className="w-3.5 h-3.5" />,
    pill: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
    border: "#c084fc",
    active: true,
    group: "active",
  },
  READY: {
    label: "พร้อมรับแล้ว",
    icon: <PackageCheck className="w-3.5 h-3.5" />,
    pill: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    border: "#2dd4bf",
    active: true,
    group: "active",
  },
  PICKED_UP: {
    label: "ไรเดอร์รับแล้ว",
    icon: <Bike className="w-3.5 h-3.5" />,
    pill: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
    border: "#22d3ee",
    active: true,
    group: "active",
  },
  DELIVERING: {
    label: "กำลังส่ง",
    icon: <Bike className="w-3.5 h-3.5" />,
    pill: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    border: "#818cf8",
    active: true,
    group: "active",
  },
  COMPLETED: {
    label: "เสร็จสิ้น",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    pill: "bg-green-50 text-green-700 ring-1 ring-green-200",
    border: "#86efac",
    active: false,
    group: "done",
  },
  CANCELLED: {
    label: "ยกเลิกแล้ว",
    icon: <XCircle className="w-3.5 h-3.5" />,
    pill: "bg-red-50 text-red-500 ring-1 ring-red-200",
    border: "#fca5a5",
    active: false,
    group: "cancelled",
  },
};

type TabKey = "all" | "active" | "done" | "cancelled";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "active", label: "กำลังดำเนินการ" },
  { key: "done", label: "เสร็จสิ้น" },
  { key: "cancelled", label: "ยกเลิก" },
];

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return "เมื่อกี้";
  if (diffMin < 60) return diffMin + " นาทีที่แล้ว";
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + " ชั่วโมงที่แล้ว";
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "เมื่อวาน";
  if (diffD < 7) return diffD + " วันที่แล้ว";
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["PENDING"];
  const isPickup = (order as any).orderType === "PICKUP";
  const isActive = cfg.active;
  const itemNames = order.items.slice(0, 2).map((i: any) => i.product.name).join(", ");
  const extraCount = order.items.length > 2 ? order.items.length - 2 : 0;
  const thumbs = order.items.slice(0, 3).map((i: any) => i.product.image).filter(Boolean);

  return (
    <Link href={`/orders/${order.id}`}>
      <div
        className="bg-white rounded-2xl overflow-hidden transition-all active:scale-[0.985]"
        style={{
          boxShadow: isActive
            ? "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1.5px " + cfg.border + "40"
            : "0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px #ebebeb",
          borderLeft: isActive ? "4px solid " + cfg.border : "4px solid transparent",
        }}
      >
        <div className="flex items-stretch">
          {/* Main content */}
          <div className="flex-1 min-w-0 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] text-gray-400 font-mono tracking-wide">
                #{order.id.slice(-8).toUpperCase()}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full",
                cfg.pill
              )}>
                {cfg.icon}
                {cfg.label}
              </span>
            </div>

            <p className="text-sm font-medium text-gray-800 leading-snug line-clamp-1 mb-2.5">
              {itemNames}
              {extraCount > 0 && (
                <span className="ml-1 text-xs text-gray-400 font-normal">+{extraCount} รายการ</span>
              )}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                {isPickup
                  ? <><MapPin className="w-3 h-3" /><span>รับหน้าร้าน</span></>
                  : <><Bike className="w-3 h-3" /><span>จัดส่ง</span></>}
                <span className="text-gray-200 mx-0.5">|</span>
                <span>{formatRelative(order.createdAt as unknown as string)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-gray-800">{formatPrice(order.total)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {thumbs.length > 0 && (
            <div className="flex flex-col justify-center gap-1 pr-3.5 py-3">
              {thumbs.map((src: string, idx: number) => (
                <div
                  key={idx}
                  className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"
                  style={{ opacity: isActive ? 1 : 0.6 }}
                >
                  <Image src={src} alt="" fill className="object-cover" sizes="48px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active shimmer bar */}
        {isActive && (
          <div
            className="h-[3px] w-full"
            style={{
              background: "linear-gradient(90deg," + cfg.border + "33 0%," + cfg.border + " 50%," + cfg.border + "33 100%)",
            }}
          />
        )}
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex gap-3 px-4 py-3.5">
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-4 w-44 rounded-full" />
          <Skeleton className="h-3 w-36 rounded-full" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [tab, setTab] = useState<TabKey>("all");

  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["orders"],
    queryFn: () => fetch("/api/orders").then((r) => r.json()).then((d) => d.data),
  });

  const counts: Record<TabKey, number> = {
    all: orders.length,
    active: orders.filter((o) => STATUS_CONFIG[o.status]?.group === "active").length,
    done: orders.filter((o) => STATUS_CONFIG[o.status]?.group === "done").length,
    cancelled: orders.filter((o) => STATUS_CONFIG[o.status]?.group === "cancelled").length,
  };

  const filtered = tab === "all"
    ? orders
    : orders.filter((o) => STATUS_CONFIG[o.status]?.group === tab);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 h-14 flex items-center gap-2">
          <h1 className="font-semibold text-base text-gray-800">ออเดอร์ของฉัน</h1>
          {!isLoading && orders.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
          {TABS.map((t) => {
            const isSelected = tab === t.key;
            const cnt = counts[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                  isSelected
                    ? "text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                )}
                style={isSelected ? { background: "oklch(0.68 0.20 148)" } : {}}
              >
                {t.label}
                {cnt > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0 rounded-full leading-5",
                    isSelected ? "bg-white/25 text-white" : "bg-white text-gray-500"
                  )}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-4 space-y-2.5 pb-24">
        {isLoading ? (
          <div className="space-y-2.5 pt-1">
            {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "oklch(0.97 0.02 148)" }}
            >
              {tab === "cancelled"
                ? <XCircle className="w-9 h-9 text-gray-300" />
                : tab === "done"
                  ? <CheckCircle2 className="w-9 h-9 text-gray-300" />
                  : <UtensilsCrossed className="w-9 h-9" style={{ color: "oklch(0.68 0.20 148)" }} />}
            </div>
            <p className="font-medium text-gray-600 mb-1">
              {tab === "all" ? "ยังไม่มีออเดอร์" : "ไม่มีออเดอร์ในหมวดนี้"}
            </p>
            {tab === "all" && (
              <>
                <p className="text-sm text-gray-400 mb-5">มีเมนูอร่อยๆ รอคุณอยู่นะ!</p>
                <Link href="/menu">
                  <button
                    className="px-7 py-2.5 rounded-full text-sm font-semibold text-white"
                    style={{ background: "oklch(0.68 0.20 148)" }}
                  >
                    ดูเมนู
                  </button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Active pulse label — only on "all" tab when mixing */}
            {tab === "all" && counts.active > 0 && (
              <div className="flex items-center gap-2 pt-1 pb-0.5 px-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  กำลังดำเนินการ {counts.active} รายการ
                </span>
              </div>
            )}
            {filtered.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
