"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, MapPin, Phone, RotateCcw, X, Star,
  Clock, CheckCircle2, ChefHat, Package, Bike, Truck,
  PartyPopper, Store, CreditCard, Receipt, Sparkles,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatPrice, formatDateTime, formatTime } from "@/lib/format";
import { PAYMENT_METHOD_MAP, type OrderWithItems } from "@/types";
import { useCartStore } from "@/store/cart";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/customer/map-picker"), { ssr: false });

const G = {
  primary:   "oklch(0.64 0.200 145)",
  primaryDk: "oklch(0.51 0.185 148)",
  primaryLt: "oklch(0.93 0.068 140)",
  grad:      "linear-gradient(135deg, oklch(0.64 0.200 145) 0%, oklch(0.51 0.185 148) 100%)",
};

/* ── Status step definitions ─────────────────────────────── */
const STATUS_STEPS_DELIVERY = [
  { key: "PENDING",    label: "รับออเดอร์",  Icon: Clock },
  { key: "CONFIRMED",  label: "ยืนยันแล้ว",  Icon: CheckCircle2 },
  { key: "PREPARING",  label: "กำลังทำ",     Icon: ChefHat },
  { key: "READY",      label: "พร้อมส่ง",    Icon: Package },
  { key: "PICKED_UP",  label: "ไรเดอร์รับ",  Icon: Bike },
  { key: "DELIVERING", label: "กำลังส่ง",    Icon: Truck },
  { key: "COMPLETED",  label: "ถึงแล้ว",     Icon: PartyPopper },
];
const STATUS_STEPS_PICKUP = [
  { key: "PENDING",    label: "รับออเดอร์",  Icon: Clock },
  { key: "CONFIRMED",  label: "ยืนยันแล้ว",  Icon: CheckCircle2 },
  { key: "PREPARING",  label: "กำลังทำ",     Icon: ChefHat },
  { key: "READY",      label: "พร้อมรับ",    Icon: Store },
  { key: "COMPLETED",  label: "รับแล้ว",     Icon: PartyPopper },
];

/* ── Per-status display metadata ─────────────────────────── */
const STATUS_META: Record<string, { label: string; pill: string; headerBg: string }> = {
  PENDING_PAYMENT: { label: "รอชำระเงิน",   pill: "bg-amber-100 text-amber-700",  headerBg: "#fef3c7" },
  PENDING:         { label: "รอรับออเดอร์",  pill: "bg-orange-100 text-orange-700", headerBg: "#ffedd5" },
  CONFIRMED:       { label: "รับออเดอร์แล้ว", pill: "bg-blue-100 text-blue-700",   headerBg: "#dbeafe" },
  PREPARING:       { label: "กำลังเตรียม",   pill: "bg-purple-100 text-purple-700", headerBg: "#f3e8ff" },
  READY:           { label: "พร้อมแล้ว!",    pill: "bg-teal-100 text-teal-700",    headerBg: "#ccfbf1" },
  PICKED_UP:       { label: "ไรเดอร์รับแล้ว", pill: "bg-cyan-100 text-cyan-700",   headerBg: "#cffafe" },
  DELIVERING:      { label: "กำลังส่ง",      pill: "bg-indigo-100 text-indigo-700", headerBg: "#e0e7ff" },
  COMPLETED:       { label: "เสร็จสิ้น",     pill: "bg-green-100 text-green-700",  headerBg: "#dcfce7" },
  CANCELLED:       { label: "ยกเลิกแล้ว",    pill: "bg-red-100 text-red-500",      headerBg: "#fee2e2" },
};

/* ── Stepper ─────────────────────────────────────────────── */
function Stepper({ steps, statusOrder, stepIndex }: {
  steps: typeof STATUS_STEPS_DELIVERY;
  statusOrder: string[];
  stepIndex: number;
}) {
  return (
    <div className="flex items-start justify-between relative px-1">
      {/* connecting line */}
      <div className="absolute top-4 left-5 right-5 h-0.5 bg-gray-100 z-0" />
      <div
        className="absolute top-4 left-5 h-0.5 z-0 transition-all duration-700"
        style={{
          background: G.primary,
          width: stepIndex <= 0 ? "0%" : (stepIndex / (steps.length - 1)) * 100 + "%",
          maxWidth: "calc(100% - 2.5rem)",
        }}
      />

      {steps.map((step, idx) => {
        const done    = stepIndex >= idx;
        const current = stepIndex === idx;
        return (
          <div key={step.key} className="flex flex-col items-center gap-1.5 z-10 min-w-0" style={{ flex: 1 }}>
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                done ? "text-white shadow-sm" : "bg-white border-2 border-gray-200 text-gray-300",
                current && "ring-2 ring-offset-2"
              )}
              style={done
                ? { background: G.primary }
                : {}
              }
              // current ring color via inline since tailwind ring-color won't pick up oklch
            >
              {current && (
                <span
                  className="absolute w-8 h-8 rounded-full ring-2 ring-offset-2 pointer-events-none"
                  style={{ boxShadow: "0 0 0 2px white, 0 0 0 4px " + G.primary }}
                />
              )}
              <step.Icon className="w-3.5 h-3.5" />
            </div>
            <span
              className={cn("text-[9px] text-center leading-tight font-medium")}
              style={{ color: done ? G.primary : "#9ca3af" }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function OrderDetailPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { addItem } = useCartStore();

  const [currentStatus, setCurrentStatus] = useState("");
  const [cancelling,    setCancelling]    = useState(false);
  const [reviewOpen,    setReviewOpen]    = useState(false);
  const [reviewProductId, setReviewProductId] = useState<string | null>(null);
  const [reviewRating,  setReviewRating]  = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving,  setReviewSaving]  = useState(false);

  const { data: order, isLoading } = useQuery<OrderWithItems>({
    queryKey: ["order", params.id],
    queryFn: () => fetch(`/api/orders/${params.id}`).then((r) => r.json()).then((d) => d.data),
    refetchInterval: 30000,
  });

  useEffect(() => { if (order) setCurrentStatus(order.status); }, [order]);

  useEffect(() => {
    const es = new EventSource(`/api/sse/orders?orderId=${params.id}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "order_update") {
        setCurrentStatus(data.status);
        queryClient.invalidateQueries({ queryKey: ["order", params.id] });
      }
    };
    return () => es.close();
  }, [params.id, queryClient]);

  const handleCancel = async () => {
    if (!confirm("ยืนยันการยกเลิกออเดอร์?")) return;
    setCancelling(true);
    try {
      const res  = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("ยกเลิกออเดอร์แล้ว");
        queryClient.invalidateQueries({ queryKey: ["order", params.id] });
      } else toast.error(data.error);
    } finally { setCancelling(false); }
  };

  const handleReorder = () => {
    if (!order) return;
    order.items.forEach((item: any) => {
      addItem({ productId: item.productId, name: item.product.name, price: item.unitPrice, image: item.product.image ?? null, options: [] });
    });
    toast.success("เพิ่มรายการลงตะกร้าแล้ว!");
    router.push("/cart");
  };

  const handleSubmitReview = async () => {
    if (!reviewProductId) return;
    setReviewSaving(true);
    try {
      const res  = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: reviewProductId, orderId: params.id, rating: reviewRating, comment: reviewComment }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("รีวิวสำเร็จ! ขอบคุณ");
        setReviewOpen(false); setReviewProductId(null); setReviewComment(""); setReviewRating(5);
      } else toast.error(data.error);
    } finally { setReviewSaving(false); }
  };

  /* ── Derived state ─── */
  const isPickup     = (order as any)?.orderType === "PICKUP";
  const STATUS_STEPS = isPickup ? STATUS_STEPS_PICKUP : STATUS_STEPS_DELIVERY;
  const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);
  const stepIndex    = STATUS_ORDER.indexOf(currentStatus);
  const meta         = STATUS_META[currentStatus] ?? { label: currentStatus, pill: "bg-gray-100 text-gray-600", headerBg: "#f9fafb" };
  const canCancel    = ["PENDING_PAYMENT", "PENDING"].includes(currentStatus);
  const isCompleted  = currentStatus === "COMPLETED";
  const isCancelled  = currentStatus === "CANCELLED";
  const isDelivering = !isPickup && ["DELIVERING", "PICKED_UP"].includes(currentStatus);
  const riderHasLocation = order?.rider?.currentLat && order?.rider?.currentLng;

  /* ── Loading ─── */
  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-8 h-8 border-[3px] border-t-transparent rounded-full animate-spin"
        style={{ borderColor: G.primary, borderTopColor: "transparent" }} />
    </div>
  );
  if (!order) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background">
      <p className="text-muted-foreground">ไม่พบออเดอร์</p>
      <Link href="/orders"><span className="text-sm font-medium" style={{ color: G.primary }}>ดูออเดอร์ทั้งหมด</span></Link>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">

      {/* ── Colored hero header ── */}
      <div
        className="sticky-header"
        style={{ background: isCancelled ? "#fee2e2" : isCompleted ? "#dcfce7" : meta.headerBg }}
      >
        <div className="flex items-center gap-2 px-4 h-14 pt-2">
          <Link href="/orders">
            <div className="w-8 h-8 rounded-full bg-black/8 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </div>
          </Link>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-800 leading-none">
              {(order as any).user?.name ? `สวัสดี ${(order as any).user.name}` : "ติดตามออเดอร์"}
            </p>
            <p className="text-[11px] text-gray-500 font-mono mt-0.5">#{order.id.slice(-8).toUpperCase()}</p>
          </div>
          {currentStatus === "PENDING_PAYMENT" ? (
            <Link href={`/orders/${params.id}/payment`}>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 animate-pulse">
                <CreditCard className="w-3 h-3" />
                ชำระเงิน
              </span>
            </Link>
          ) : (
            <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full", meta.pill)}>
              {meta.label}
            </span>
          )}
        </div>

        {/* ETA bar */}
        {order.estimatedDeliveryAt && !isCancelled && !isCompleted && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.primary }} />
              <span className="text-xs text-gray-600">
                คาดว่าจะ{isPickup ? "พร้อมรับ" : "ถึง"}เวลา{" "}
                <strong style={{ color: G.primaryDk }}>{formatTime(order.estimatedDeliveryAt)}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 pb-28">

        {/* ── Status stepper ── */}
        {!isCancelled && (
          <div className="bg-white rounded-2xl px-4 py-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
              สถานะออเดอร์
            </p>
            <Stepper steps={STATUS_STEPS} statusOrder={STATUS_ORDER} stepIndex={stepIndex} />
          </div>
        )}

        {/* ── Cancelled banner ── */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <X className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-red-700">ออเดอร์ถูกยกเลิก</p>
              <p className="text-xs text-red-400 mt-0.5">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
        )}

        {/* ── Pickup info ── */}
        {isPickup && !isCancelled && (
          <div
            className="rounded-2xl p-4 flex gap-3 items-start border"
            style={{ background: G.primaryLt, borderColor: G.primary + "30" }}
          >
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Store className="w-5 h-5" style={{ color: G.primary }} />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">มารับที่ร้านได้เลย</p>
              <p className="text-xs text-gray-500 mt-0.5">ร้านจะแจ้งเมื่อออเดอร์พร้อมรับ</p>
              {currentStatus === "READY" && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1"
                  style={{ background: G.primary }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span className="text-xs font-semibold text-white">พร้อมให้รับแล้ว!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Rider card ── */}
        {!isPickup && order.rider && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: G.primaryLt }}>
                <Bike className="w-5 h-5" style={{ color: G.primary }} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-800">{order.rider.name}</p>
                <p className="text-xs text-gray-400">{order.rider.vehiclePlate ?? "—"}</p>
              </div>
              <a href={"tel:" + order.rider.phone}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: G.primaryLt }}>
                <Phone className="w-4 h-4" style={{ color: G.primary }} />
              </a>
            </div>
            {isDelivering && riderHasLocation && (
              <div style={{ height: "180px" }}>
                <MapPicker
                  center={[order.rider.currentLat!, order.rider.currentLng!]}
                  selected={[order.rider.currentLat!, order.rider.currentLng!]}
                  onSelect={() => {}}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Delivery address ── */}
        {!isPickup && order.address && (
          <div className="bg-white rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: G.primary }} />
              <span className="font-semibold text-sm text-gray-700">ที่อยู่จัดส่ง</span>
            </div>
            <p className="text-sm font-medium text-gray-800 ml-6">{order.address.label}</p>
            <p className="text-xs text-gray-400 ml-6 mt-0.5">{order.address.fullAddress}</p>
          </div>
        )}

        {/* ── Order items ── */}
        <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Receipt className="w-4 h-4" style={{ color: G.primary }} />
            <span className="font-semibold text-sm text-gray-700">รายการสั่ง</span>
            <span className="ml-auto text-[11px] text-gray-400">{order.items.length} รายการ</span>
          </div>

          <div className="divide-y divide-gray-50">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                {/* Thumbnail */}
                {item.product.image ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="48px" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <ChefHat className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                  {item.note && <p className="text-xs text-gray-400 truncate">{item.note}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-gray-400">x{item.quantity}</span>
                    {isCompleted && (
                      <button
                        onClick={() => { setReviewProductId(item.productId); setReviewOpen(true); }}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: G.primaryLt, color: G.primary }}
                      >
                        <Star className="w-3 h-3" />รีวิว
                      </button>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-700 flex-shrink-0">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Price summary */}
          <div className="px-4 py-3 border-t border-gray-100 space-y-2">
            {/* Customer name row */}
            {(order as any).user?.name && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">ชื่อลูกค้า</span>
                <span className="font-semibold text-gray-700">{(order as any).user.name}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-400">
              <span>ค่าส่ง</span>
              <span>{formatPrice(order.deliveryFee)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>ส่วนลด</span>
                <span>-{formatPrice(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-100">
              <span className="font-bold text-sm text-gray-800">ยอดรวม</span>
              <span className="font-bold text-lg" style={{ color: G.primary }}>
                {formatPrice(order.total)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pt-0.5">
              <CreditCard className="w-3.5 h-3.5 text-gray-300" />
              <span className="text-xs text-gray-400">{PAYMENT_METHOD_MAP[order.paymentMethod]}</span>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="space-y-2.5 pt-1">

          {/* Pay now — for PENDING_PAYMENT orders */}
          {currentStatus === "PENDING_PAYMENT" && (
            <Link href={`/orders/${params.id}/payment`}>
              <div className="w-full rounded-2xl overflow-hidden"
                style={{ background: "linear-gradient(135deg, oklch(0.75 0.18 85) 0%, oklch(0.55 0.20 60) 100%)", boxShadow: "0 6px 20px oklch(0.65 0.18 80 / 0.35)" }}>
                <div className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-white text-[15px]">ชำระเงินตอนนี้</p>
                    <p className="text-white/80 text-xs mt-0.5">กดเพื่อสแกน QR PromptPay และอัปโหลดสลิป</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5 text-white rotate-180" />
                  </div>
                </div>
                <div className="px-4 pb-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-white/60 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-bold text-white/70">รอการชำระ</span>
                </div>
              </div>
            </Link>
          )}

          {isCompleted && (
            <button
              onClick={handleReorder}
              className="w-full h-13 flex items-center justify-center gap-2 rounded-2xl font-semibold text-sm text-white shadow-sm"
              style={{ background: G.grad, height: "52px" }}
            >
              <RotateCcw className="w-4 h-4" />
              สั่งอีกครั้ง
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl font-medium text-sm text-red-500 bg-red-50 border border-red-200 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกออเดอร์"}
            </button>
          )}
        </div>

        {/* Order date */}
        <p className="text-center text-[11px] text-gray-300 pb-2">
          สั่งเมื่อ {formatDateTime(order.createdAt)}
        </p>
      </div>

      {/* ── Review Dialog ── */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">รีวิวสินค้า</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setReviewRating(s)}>
                  <Star
                    className="w-9 h-9 transition-all"
                    fill={s <= reviewRating ? "oklch(0.80 0.18 85)" : "none"}
                    stroke={s <= reviewRating ? "oklch(0.70 0.18 85)" : "#d1d5db"}
                  />
                </button>
              ))}
            </div>
            <textarea
              placeholder="เล่าประสบการณ์ของคุณ... (ไม่บังคับ)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 bg-gray-50"
              style={{ "--tw-ring-color": G.primary } as React.CSSProperties}
            />
            <button
              onClick={handleSubmitReview}
              disabled={reviewSaving}
              className="w-full h-12 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: G.grad }}
            >
              {reviewSaving ? "กำลังส่ง..." : "ส่งรีวิว"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
