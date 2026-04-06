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
  Sparkles,
  Store,
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
  return date.toLocaleDateString("th-TH-u-ca-gregory", { day: "numeric", month: "short" });
}

function OrderCard({ order }: { order: OrderWithItems }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["PENDING"];
  const isPickup = (order as any).orderType === "PICKUP";
  const isActive = cfg.active;
  const isReady = order.status === "READY";
  const isPendingPayment = order.status === "PENDING_PAYMENT";
  const totalQty = order.items.reduce((s: number, i: any) => s + i.quantity, 0);
  const itemNames = order.items.slice(0, 2).map((i: any) => i.product.name).join(", ");
  const extraCount = order.items.length > 2 ? order.items.length - 2 : 0;
  const thumbs = order.items.slice(0, 3).map((i: any) => i.product.image).filter(Boolean) as string[];

  return (
    <Link href={`/orders/${order.id}`}>
      <div
        className="bg-white rounded-2xl overflow-hidden transition-all active:scale-[0.985]"
        style={{
          boxShadow: isReady
            ? "0 0 0 2px #2dd4bf, 0 4px 16px #2dd4bf20"
            : isActive
              ? "0 2px 16px rgba(0,0,0,0.08), 0 0 0 1.5px " + cfg.border + "40"
              : "0 1px 6px rgba(0,0,0,0.06), 0 0 0 1px #f0f0f0",
        }}
      >
        <div className="p-4 space-y-3.5">

          {/* Row 1: Status badge + time */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full",
              cfg.pill
            )}>
              {cfg.icon}
              {cfg.label}
            </span>
            <span className="text-[11px] text-gray-400">
              {formatRelative(order.createdAt as unknown as string)}
              <span className="ml-1.5 font-mono text-gray-300">#{order.id.slice(-6).toUpperCase()}</span>
            </span>
          </div>

          {/* Row 2: Thumbnails + item names */}
          <div className="flex items-center gap-3">
            {thumbs.length > 0 && (
              <div className="flex items-center flex-shrink-0">
                {thumbs.map((src, i) => (
                  <div
                    key={i}
                    className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border-2 border-white"
                    style={{ marginLeft: i === 0 ? 0 : -8, zIndex: thumbs.length - i, opacity: isActive ? 1 : 0.5 }}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="48px" />
                  </div>
                ))}
                {extraCount > 0 && (
                  <div
                    className="w-12 h-12 rounded-xl bg-gray-100 border-2 border-white flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-gray-400"
                    style={{ marginLeft: -8, zIndex: 0 }}
                  >
                    +{extraCount}
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-800 line-clamp-1 leading-snug">
                {itemNames}{extraCount > 0 && thumbs.length === 0 && <span className="font-normal text-gray-400"> +{extraCount}</span>}
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">{totalQty} รายการ</p>
            </div>
          </div>

          {/* READY callout */}
          {isReady && (
            <div className="flex items-center gap-2 bg-teal-50 rounded-xl px-3 py-2.5">
              <Sparkles className="w-4 h-4 text-teal-500 flex-shrink-0 animate-pulse" />
              <span className="text-[13px] font-extrabold text-teal-700">พร้อมให้รับแล้ว! มารับได้เลย</span>
            </div>
          )}

          {/* PENDING_PAYMENT callout */}
          {isPendingPayment && (
            <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
              style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <CreditCard className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-amber-700 flex-1">ยังไม่ได้ชำระเงิน</span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500 text-white">ชำระเลย</span>
            </div>
          )}

          {/* Row 3: type + price */}
          <div className="flex items-center justify-between border-t border-gray-50 pt-3">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
              {isPickup
                ? <><Store className="w-3.5 h-3.5" /><span>รับหน้าร้าน</span></>
                : <><MapPin className="w-3.5 h-3.5" /><span>จัดส่ง</span></>}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-extrabold text-gray-800">{formatPrice(order.total)}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </div>
        </div>
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
  const [tab, setTab] = useState<TabKey>("active");

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
      <header className="sticky-header bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="px-4 h-14 pt-2 flex items-center gap-2">
          <h1 className="font-bold text-lg text-gray-800">ออเดอร์ของฉัน</h1>
          {!isLoading && counts.active > 0 && (
            <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {counts.active} กำลังดำเนินการ
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
                style={isSelected ? { background: "oklch(0.69 0.21 152)" } : {}}
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
      <div className="flex-1 px-4 py-5 space-y-4 pb-24">
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
                  : <UtensilsCrossed className="w-9 h-9" style={{ color: "oklch(0.69 0.21 152)" }} />}
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
                    style={{ background: "oklch(0.69 0.21 152)" }}
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
