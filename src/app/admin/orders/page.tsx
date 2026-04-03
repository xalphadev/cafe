"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Image from "next/image";
import {
  RefreshCw, Bell, ExternalLink, Clock, ChefHat, Package,
  Bike, Store, CheckCircle2, XCircle, Printer,
  MapPin, CreditCard, StickyNote, AlertCircle, ChevronRight, CupSoda,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDateTime, formatPhone } from "@/lib/format";
import { ORDER_STATUS_MAP, PAYMENT_METHOD_MAP, type OrderWithItems } from "@/types";
import { cn } from "@/lib/utils";

// ── transitions (pickup-only) ─────────────────────────────────────────────
const STATUS_TRANSITIONS: Record<string, string> = {
  PENDING: "CONFIRMED", CONFIRMED: "PREPARING",
  PREPARING: "READY", READY: "COMPLETED",
};
const STATUS_TRANSITIONS_PICKUP = STATUS_TRANSITIONS;
const ALL_STATUSES = ["PENDING_PAYMENT", "PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

// ── per-status design tokens ───────────────────────────────────────────────
type StatusTheme = { bar: string; pill: string; pillText: string; dot: string };
const STATUS_THEME: Record<string, StatusTheme> = {
  PENDING:         { bar: "bg-amber-400",   pill: "bg-amber-100",   pillText: "text-amber-700",   dot: "bg-amber-400" },
  PENDING_PAYMENT: { bar: "bg-yellow-400",  pill: "bg-yellow-100",  pillText: "text-yellow-700",  dot: "bg-yellow-400" },
  CONFIRMED:       { bar: "bg-blue-400",    pill: "bg-blue-100",    pillText: "text-blue-700",    dot: "bg-blue-400" },
  PREPARING:       { bar: "bg-violet-500",  pill: "bg-violet-100",  pillText: "text-violet-700",  dot: "bg-violet-500" },
  READY:           { bar: "bg-teal-500",    pill: "bg-teal-100",    pillText: "text-teal-700",    dot: "bg-teal-500" },
  PICKED_UP:       { bar: "bg-cyan-500",    pill: "bg-cyan-100",    pillText: "text-cyan-700",    dot: "bg-cyan-500" },
  DELIVERING:      { bar: "bg-indigo-500",  pill: "bg-indigo-100",  pillText: "text-indigo-700",  dot: "bg-indigo-500" },
  COMPLETED:       { bar: "bg-green-500",   pill: "bg-green-100",   pillText: "text-green-700",   dot: "bg-green-500" },
  CANCELLED:       { bar: "bg-slate-300",   pill: "bg-slate-100",   pillText: "text-slate-500",   dot: "bg-slate-300" },
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Bell className="w-3.5 h-3.5" />,
  PENDING_PAYMENT: <CreditCard className="w-3.5 h-3.5" />,
  CONFIRMED: <CheckCircle2 className="w-3.5 h-3.5" />,
  PREPARING: <ChefHat className="w-3.5 h-3.5" />,
  READY: <Package className="w-3.5 h-3.5" />,
  PICKED_UP: <Bike className="w-3.5 h-3.5" />,
  DELIVERING: <Bike className="w-3.5 h-3.5" />,
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5" />,
  CANCELLED: <XCircle className="w-3.5 h-3.5" />,
};

function timeAgo(date: string | Date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s} วิ`;
  if (s < 3600) return `${Math.floor(s / 60)} นาที`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.`;
  return formatDateTime(date);
}
function initials(name?: string, phone?: string) {
  if (name && name !== "—" && name.trim()) return name.trim()[0].toUpperCase();
  if (phone) return phone.replace(/\D/g, "").slice(-2);
  return "?";
}

// ── StatusPill ─────────────────────────────────────────────────────────────
function StatusPill({ status, size = "sm" }: { status: string; size?: "sm" | "md" }) {
  const t = STATUS_THEME[status];
  const info = ORDER_STATUS_MAP[status];
  if (!t || !info) return null;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold rounded-full",
      t.pill, t.pillText,
      size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-3 py-1"
    )}>
      {STATUS_ICON[status]}
      {info.label}
    </span>
  );
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState(false); // kept for refetch trigger only
  const [eta, setEta] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    variant?: "danger" | "primary";
    action: () => void;
  } | null>(null);

  const { data, isLoading, refetch } = useQuery<{ orders: OrderWithItems[]; total: number }>({
    queryKey: ["admin-orders", selectedStatus],
    queryFn: () => fetch(`/api/admin/orders?status=${selectedStatus}`).then(r => r.json()).then(d => d.data),
    refetchInterval: 15000,
  });

  const { data: statusCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["admin-orders-counts"],
    queryFn: () => fetch("/api/admin/orders/counts").then(r => r.json()).then(d => d.data),
    refetchInterval: 15000,
  });
  // SSE: just refresh order list when new order arrives (sound/banner handled by NewOrderAlert in layout)
  useEffect(() => {
    const es = new EventSource("/api/sse/orders");
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev.type === "new_order") {
          setNewOrderAlert(true);
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders-counts"] });
          queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
        }
      } catch {}
    };
    return () => es.close();
  }, [queryClient]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success(`"${ORDER_STATUS_MAP[newStatus]?.label}" แล้ว`);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-counts"] });
      if (selectedOrder?.id === orderId)
        setSelectedOrder((p: any) => p ? { ...p, status: newStatus } : null);
    } finally { setUpdating(null); }
  };

  const saveMeta = async () => {
    if (!selectedOrder || !eta) return;
    setUpdating(selectedOrder.id);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedDeliveryAt: eta }),
      });
      const d = await res.json();
      if (!d.success) { toast.error(d.error); return; }
      toast.success("บันทึกแล้ว");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    } finally { setUpdating(null); }
  };

  const isPickup = (o: any) => o?.orderType === "PICKUP";
  const nextOf  = (o: any) => (isPickup(o) ? STATUS_TRANSITIONS_PICKUP : STATUS_TRANSITIONS)[o.status];

  const orders = data?.orders ?? [];

  return (
    <div className="max-w-2xl mx-auto min-h-screen bg-slate-100">

      {/* ══ Header + Tabs (combined) ═════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white shadow-sm">
        {/* Row 1: title + total + refresh */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-2">
          <h1 className="font-bold text-[15px] flex-shrink-0">ออเดอร์</h1>
          <span className="text-[12px] text-muted-foreground flex-shrink-0">
            {data?.total ?? 0} รายการ
          </span>
          {newOrderAlert && (
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inset-0 rounded-full bg-amber-400 opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => { refetch(); setNewOrderAlert(false); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Row 2: status tabs */}
        <div className="px-3 pb-2.5">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1 px-0.5">
            {ALL_STATUSES.map(s => {
              const active = selectedStatus === s;
              const t = STATUS_THEME[s];
              const count = statusCounts[s] ?? 0;
              const showCount = count > 0;
              const OUTLINE_COLOR: Record<string, string> = {
                PENDING: "#f59e0b", PENDING_PAYMENT: "#eab308",
                CONFIRMED: "#3b82f6", PREPARING: "#8b5cf6",
                READY: "#14b8a6", PICKED_UP: "#06b6d4",
                DELIVERING: "#6366f1", COMPLETED: "#22c55e",
                CANCELLED: "#94a3b8",
              };
              return (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={cn(
                    "relative flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all",
                    active
                      ? (t ? cn(t.pill, t.pillText) : "bg-primary text-white")
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  )}
                  style={active ? { outline: `2px solid ${t ? OUTLINE_COLOR[s] : "var(--primary)"}`, outlineOffset: "1px" } : undefined}
                >
                  {active && t && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", t.dot)} />}
                  {s === "ALL" ? "ทั้งหมด" : ORDER_STATUS_MAP[s]?.label ?? s}
                  {showCount && (
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none",
                      active
                        ? (t ? "bg-white/70 " + t.pillText : "bg-white/30 text-white")
                        : "bg-slate-300 text-slate-600"
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ Orders ══════════════════════════════════════════ */}
      <div className="p-3 space-y-2.5 pb-28">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="h-1.5 bg-slate-200 animate-pulse" />
              <div className="p-4 space-y-2 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-3.5 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                  </div>
                  <div className="w-16 h-6 bg-slate-200 rounded-lg" />
                </div>
              </div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 opacity-30" />
            </div>
            <p className="text-sm">ไม่มีออเดอร์</p>
          </div>
        ) : orders.map(order => {
          const t      = STATUS_THEME[order.status] ?? STATUS_THEME.CANCELLED;
          const next   = nextOf(order);
          const pickup = isPickup(order);
          const customer = (order.user as any);
          const urgent   = order.status === "PENDING" || order.status === "PENDING_PAYMENT";

          return (
            <div key={order.id}
              className={cn(
                "bg-white rounded-2xl overflow-hidden shadow-sm transition-all",
                urgent && "ring-1 ring-amber-200"
              )}
            >
              {/* Left-border status stripe + content */}
              <div className="flex">
                <div className={cn("w-1 flex-shrink-0 rounded-l-2xl", t.bar)} />

                <div className="flex-1 min-w-0 px-3 py-3">

                  {/* Row 1: ID + status pill + price */}
                  <div className="flex items-center gap-2 cursor-pointer"
                    onClick={() => { setSelectedOrder(order); setEta(""); }}>
                    <span className="font-bold text-[13px] font-mono tracking-wider flex-shrink-0">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <StatusPill status={order.status} />
                    {(order.payment as any)?.slipUrl && (
                      <span className="text-[10px] font-bold bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full flex-shrink-0">สลิป</span>
                    )}
                    <div className="flex-1" />
                    <span className="font-extrabold text-[15px] text-primary flex-shrink-0">{formatPrice(order.total)}</span>
                  </div>

                  {/* Row 2: customer + time + images */}
                  <div className="flex items-center gap-2 mt-1.5 cursor-pointer"
                    onClick={() => { setSelectedOrder(order); setEta(""); }}>
                    {/* Images (small, overlapping) */}
                    <div className="flex -space-x-1.5 flex-shrink-0">
                      {order.items.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 ring-1 ring-white flex-shrink-0">
                          {item.product.image
                            ? <Image src={item.product.image} alt={item.product.name} width={28} height={28} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><CupSoda className="w-3.5 h-3.5 text-slate-300" /></div>
                          }
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 ring-1 ring-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate text-slate-700">
                        {customer.name || formatPhone(customer.phone)}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {order.items.slice(0,2).map((i: any) => `${i.product.name} ×${i.quantity}`).join(" · ")}
                        {order.items.length > 2 && <span className="text-primary"> +{order.items.length - 2}</span>}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">{timeAgo(order.createdAt)}</span>
                  </div>

                  {/* Row 3: action buttons (compact, inside card) */}
                  {(next || order.status === "PENDING" || order.status === "PENDING_PAYMENT") && (
                    <div className="flex gap-2 mt-2.5">
                      {next && (
                        <button
                          onClick={() => setConfirmAction({
                            title: `เปลี่ยนเป็น "${ORDER_STATUS_MAP[next]?.label}"?`,
                            description: `#${order.id.slice(-6).toUpperCase()}`,
                            confirmLabel: ORDER_STATUS_MAP[next]?.label,
                            variant: "primary",
                            action: () => updateStatus(order.id, next),
                          })}
                          disabled={updating === order.id}
                          className="flex-1 h-9 rounded-xl text-[12px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-40 active:opacity-70 transition-opacity bg-primary"
                        >
                          {updating === order.id
                            ? <span className="text-[11px]">กำลังอัปเดต...</span>
                            : <>{STATUS_ICON[next]}<span>{ORDER_STATUS_MAP[next]?.label}</span></>
                          }
                        </button>
                      )}
                      {(order.status === "PENDING" || order.status === "PENDING_PAYMENT") && (
                        <button
                          onClick={() => setConfirmAction({
                            title: "ยกเลิกออเดอร์?",
                            description: `#${order.id.slice(-6).toUpperCase()} จะถูกยกเลิก`,
                            confirmLabel: "ยกเลิก",
                            variant: "danger",
                            action: () => updateStatus(order.id, "CANCELLED"),
                          })}
                          disabled={updating === order.id}
                          className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:opacity-70 transition-opacity border border-red-100 bg-red-50"
                        >
                          <XCircle className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ Detail dialog ═══════════════════════════════════ */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] h-[94vh] flex flex-col p-0 rounded-3xl overflow-hidden gap-0 shadow-2xl">
          {selectedOrder && (() => {
            const pickup  = isPickup(selectedOrder);
            const next    = nextOf(selectedOrder);
            const t       = STATUS_THEME[selectedOrder.status] ?? STATUS_THEME.CANCELLED;
            const customer = (selectedOrder.user as any);

            return (
              <>
                {/* ── Dialog header with color ── */}
                <div className={cn("flex-shrink-0 px-5 pt-5 pb-4", t.pill)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-lg tracking-wider">
                          #{selectedOrder.id.slice(-6).toUpperCase()}
                        </span>
                        <StatusPill status={selectedOrder.status} size="md" />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                          <Store className="w-3 h-3" />รับหน้าร้าน
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatDateTime(selectedOrder.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto bg-slate-50">

                  {/* Alerts */}
                  <div className="px-4 pt-4 space-y-2">
                    {selectedOrder.status === "PENDING_PAYMENT" && (
                      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-sm font-medium text-amber-800">ลูกค้ายังไม่ได้ชำระเงิน</p>
                      </div>
                    )}
                    {(selectedOrder.payment as any)?.slipUrl && (
                      <a href={(selectedOrder.payment as any).slipUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-sm font-semibold text-orange-700 flex-1">ดูสลิปการโอนเงิน</span>
                        <ChevronRight className="w-4 h-4 text-orange-400" />
                      </a>
                    )}
                    {selectedOrder.note && (
                      <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <StickyNote className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">หมายเหตุ</p>
                          <p className="text-sm text-amber-900 mt-0.5">{selectedOrder.note}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Customer ── */}
                  <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0", t.pill, t.pillText)}>
                        {initials(customer.name, customer.phone)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{customer.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{formatPhone(customer.phone)}</p>
                      </div>
                    </div>
                    {selectedOrder.address && (
                      <div className="flex items-start gap-2.5 px-4 py-3">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-relaxed">{selectedOrder.address.fullAddress}</p>
                      </div>
                    )}
                  </div>

                  {/* ── Items ── */}
                  <div className="mx-4 mt-3 bg-white rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">รายการสั่ง ({selectedOrder.items.length} รายการ)</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {selectedOrder.items.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 px-3 py-3">

                          {/* Quantity — big, left-aligned, kitchen-display style */}
                          <div className={cn(
                            "flex-shrink-0 w-11 h-11 rounded-2xl flex flex-col items-center justify-center shadow-sm",
                            t.pill
                          )}>
                            <span className={cn("text-xl font-black leading-none tabular-nums", t.pillText)}>
                              {item.quantity}
                            </span>
                            <span className={cn("text-[9px] font-semibold leading-tight", t.pillText, "opacity-70")}>ชิ้น</span>
                          </div>

                          {/* Product image */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            {item.product.image
                              ? <Image src={item.product.image} alt={item.product.name} width={48} height={48} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><CupSoda className="w-5 h-5 text-slate-300" /></div>
                            }
                          </div>

                          {/* Name + options + note */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-snug">{item.product.name}</p>
                            {item.selectedOptions?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.selectedOptions.map((opt: any, i: number) => (
                                  <span key={i} className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                    {opt.optionName}
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.note && (
                              <p className="text-[11px] text-amber-600 italic mt-0.5">"{item.note}"</p>
                            )}
                          </div>

                          {/* Price */}
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-bold text-primary">{formatPrice(item.unitPrice * item.quantity)}</p>
                            {item.quantity > 1 && (
                              <p className="text-[11px] text-muted-foreground">{formatPrice(item.unitPrice)} ×{item.quantity}</p>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>

                    {/* Price summary */}
                    <div className="px-4 py-3 bg-slate-50 space-y-1.5 border-t border-slate-100">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>ยอดสินค้า</span><span>{formatPrice(selectedOrder.subtotal)}</span>
                      </div>
                      {selectedOrder.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-green-600 font-medium">
                          <span>ส่วนลด</span><span>-{formatPrice(selectedOrder.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-sm pt-1.5 border-t border-slate-200">
                        <span>ยอดรวม</span>
                        <span className="text-primary">{formatPrice(selectedOrder.total)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pt-0.5">
                        <span>ชำระด้วย</span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          {PAYMENT_METHOD_MAP[(selectedOrder as any).paymentMethod] ?? (selectedOrder as any).paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── ETA ── */}
                  <div className="mx-4 mt-3 mb-3 bg-white rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                          เวลานัดรับ
                        </p>
                      </div>
                      {eta && (
                        <button onClick={() => setEta("")} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                          ล้าง
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      {/* Quick-pick buttons */}
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: "15 นาที", min: 15 },
                          { label: "30 นาที", min: 30 },
                          { label: "45 นาที", min: 45 },
                          { label: "1 ชม.",   min: 60 },
                          { label: "1.5 ชม.", min: 90 },
                          { label: "2 ชม.",   min: 120 },
                          { label: "3 ชม.",   min: 180 },
                          { label: "กำหนดเอง", min: -1 },
                        ].map(({ label, min }) => {
                          const targetISO = min > 0
                            ? new Date(Date.now() + min * 60000).toISOString().slice(0, 16)
                            : null;
                          const isActive = min > 0 && eta === targetISO;
                          return (
                            <button
                              key={label}
                              onClick={() => {
                                if (min === -1) {
                                  // Focus the manual input
                                  document.getElementById("eta-manual-input")?.focus();
                                } else {
                                  setEta(targetISO!);
                                }
                              }}
                              className={cn(
                                "h-10 rounded-xl text-xs font-semibold transition-all border-2",
                                isActive
                                  ? "border-primary bg-primary/10 text-primary"
                                  : min === -1
                                    ? "border-dashed border-slate-200 text-slate-400 hover:border-slate-300"
                                    : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200 hover:bg-white"
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Manual input (collapsible feel) */}
                      <div className="flex gap-2 items-center">
                        <Input
                          id="eta-manual-input"
                          type="datetime-local"
                          value={eta}
                          onChange={e => setEta(e.target.value)}
                          className="flex-1 h-10 text-sm rounded-xl"
                        />
                      </div>

                      {/* Selected ETA display */}
                      {eta && (
                        <div className="flex items-center gap-2 bg-primary/5 rounded-xl px-3 py-2">
                          <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                          <p className="text-sm font-medium text-primary">
                            {new Date(eta).toLocaleString("th-TH-u-ca-gregory", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-xl text-sm"
                        onClick={saveMeta}
                        disabled={!!updating || !eta}
                      >
                        บันทึกเวลา
                      </Button>
                    </div>
                  </div>

                </div>

                {/* ── Sticky footer actions ── */}
                <div className="flex-shrink-0 bg-white border-t border-slate-100 px-4 pt-3 pb-4 space-y-2">
                  {/* Confirm payment */}
                  {(selectedOrder as any).paymentMethod === "QR_PROMPTPAY" && (selectedOrder as any).paymentStatus !== "PAID" && (
                    <button
                      onClick={() => setConfirmAction({
                        title: "ยืนยันการชำระเงิน?",
                        description: `ออเดอร์ #${selectedOrder.id.slice(-6).toUpperCase()}`,
                        confirmLabel: "ยืนยัน",
                        variant: "primary",
                        action: async () => {
                          const res = await fetch("/api/payment/verify", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: selectedOrder.id }) });
                          const d = await res.json();
                          if (d.success) { toast.success("ยืนยันการชำระเงินแล้ว"); queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); } else toast.error(d.error);
                        },
                      })}
                      className="w-full h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />ยืนยันการชำระเงิน
                    </button>
                  )}

                  {/* Next status */}
                  {next && (
                    <button
                      onClick={() => setConfirmAction({
                        title: `เปลี่ยนสถานะเป็น "${ORDER_STATUS_MAP[next]?.label}"?`,
                        description: `ออเดอร์ #${selectedOrder.id.slice(-6).toUpperCase()}`,
                        confirmLabel: ORDER_STATUS_MAP[next]?.label,
                        variant: "primary",
                        action: () => updateStatus(selectedOrder.id, next),
                      })}
                      disabled={!!updating}
                      className={cn("w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-70 disabled:opacity-40", t.bar.replace("bg-","bg-"), "text-white")}
                    >
                      {updating
                        ? "กำลังอัปเดต..."
                        : <>{STATUS_ICON[next]} เปลี่ยนเป็น &ldquo;{ORDER_STATUS_MAP[next]?.label}&rdquo;</>
                      }
                    </button>
                  )}

                  {/* Print */}
                  <button
                    onClick={() => {
                      const win = window.open("", "_blank"); if (!win) return;
                      const customerForReceipt = (selectedOrder.user as any);
                          const customerLabel = customerForReceipt?.name || (customerForReceipt?.phone ? formatPhone(customerForReceipt.phone) : "—");
                          win.document.write(`<html><head><title>ใบเสร็จ</title><style>body{font-family:sans-serif;padding:20px;max-width:300px;margin:0 auto}h2{text-align:center}table{width:100%}td{padding:3px 0}.total{font-weight:bold;border-top:1px solid #000;padding-top:4px}.meta{font-size:12px;color:#555;text-align:center}@media print{button{display:none}}</style></head><body><h2>ช่วงเวลาคาเฟ่</h2><p class="meta">ออเดอร์ #${selectedOrder.id.slice(-6).toUpperCase()}</p><p class="meta">${formatDateTime(selectedOrder.createdAt)}</p><p class="meta"><strong>ลูกค้า: ${customerLabel}</strong></p><hr/><table>${selectedOrder.items.map((i: any) => `<tr><td>${i.product.name} ×${i.quantity}</td><td style="text-align:right">${formatPrice(i.unitPrice * i.quantity)}</td></tr>`).join("")}</table><hr/><table>${selectedOrder.discountAmount > 0 ? `<tr><td>ส่วนลด</td><td style="text-align:right">-${formatPrice(selectedOrder.discountAmount)}</td></tr>` : ""}<tr class="total"><td>ยอดรวม</td><td style="text-align:right">${formatPrice(selectedOrder.total)}</td></tr></table><p style="text-align:center;margin-top:16px">ขอบคุณที่ใช้บริการ</p><button onclick="window.print()" style="margin-top:12px;padding:8px 16px;width:100%">พิมพ์</button></body></html>`);
                      win.document.close();
                    }}
                    className="w-full h-10 rounded-2xl border border-slate-200 text-slate-500 text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" />พิมพ์ใบเสร็จ
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(o) => { if (!o) setConfirmAction(null); }}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel}
        variant={confirmAction?.variant}
        onConfirm={() => confirmAction?.action()}
      />
    </div>
  );
}
