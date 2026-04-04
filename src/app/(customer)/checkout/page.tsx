"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft, ShoppingBag, Store, Smartphone, Wallet,
  PenLine, Star, CheckCircle2, CupSoda, Sparkles, AlertTriangle, Trash2,
} from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { useCartStore, cartKey } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";

const G = {
  grad:    "linear-gradient(160deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)",
  gradLt:  "linear-gradient(135deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)",
  primary: "oklch(0.64 0.24 162)",
  shadow:  "0 8px 24px oklch(0.55 0.22 145 / 0.28)",
};

type PaymentMethod = "QR_PROMPTPAY" | "COD";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total, clearCart, removeItem } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QR_PROMPTPAY");
  const [pointsToUse, setPointsToUse] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [unavailableIds, setUnavailableIds] = useState<string[]>([]);

  const subtotal = total();

  const { data: shopSettings } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: () => fetch("/api/shop-settings").then((r) => r.json()).then((d) => d.data),
  });

  const loyalty = user?.pointsBalance ?? 0;
  const pointsDiscount = Math.floor(pointsToUse / 100);
  const grandTotal = Math.max(0, subtotal - pointsDiscount);

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error("ตะกร้าสินค้าว่างเปล่า"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType: "PICKUP",
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note })),
          paymentMethod,
          pointsToUse,
          note,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.unavailableIds?.length) {
          setUnavailableIds(data.unavailableIds);
          toast.error(`ปิดการขายแล้ว: ${data.unavailableNames?.join(", ")}`, { duration: 5000 });
        } else {
          toast.error(data.error);
        }
        return;
      }
      clearCart();
      toast.success("สั่งซื้อสำเร็จ!");
      if (paymentMethod === "QR_PROMPTPAY") {
        router.push(`/orders/${data.data.orderId}/payment`);
      } else {
        router.push(`/orders/${data.data.orderId}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-8 text-center bg-gray-50">
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: G.gradLt }}>
          <ShoppingBag className="w-11 h-11" style={{ color: G.primary }} />
        </div>
        <h2 className="text-xl font-bold text-gray-800">ตะกร้าว่างเปล่า</h2>
        <p className="text-gray-500 text-sm">เพิ่มเครื่องดื่มก่อนทำการสั่ง</p>
        <Link href="/menu">
          <button className="mt-1 px-8 py-3 rounded-2xl text-white text-sm font-bold"
            style={{ background: G.grad, boxShadow: G.shadow }}>
            ไปที่เมนู
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-40"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3 px-4 h-14 pt-2">
          <button
            onClick={() => router.push("/cart")}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "oklch(0.95 0.02 162)" }}
          >
            <ChevronLeft className="w-5 h-5" style={{ color: G.primary }} />
          </button>
          <h1 className="font-extrabold text-lg text-gray-800">สั่งซื้อ</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-6">

        {/* ── Pickup banner ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: G.gradLt, border: "1px solid oklch(0.88 0.08 162)" }}>
          <div className="p-4 flex gap-3 items-center">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: "0 2px 8px oklch(0.55 0.18 148 / 0.15)" }}>
              <Store className="w-6 h-6" style={{ color: G.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-800">{shopSettings?.name ?? "ช่วงเวลาคาเฟ่"}</p>
              {shopSettings?.address && (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed truncate">{shopSettings.address}</p>
              )}
            </div>
            <span className="text-[11px] font-black px-3 py-1.5 rounded-full text-white flex-shrink-0"
              style={{ background: G.grad }}>
              รับหน้าร้าน
            </span>
          </div>
          <div className="px-4 pb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: G.primary }} />
            <span className="text-xs text-gray-600">ร้านจะแจ้งเตือนเมื่อออเดอร์พร้อมรับ</span>
          </div>
        </div>

        {/* ── Unavailable alert banner ── */}
        {unavailableIds.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "oklch(0.98 0.02 25)", border: "1.5px solid oklch(0.88 0.10 25)" }}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "oklch(0.55 0.22 25)" }} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: "oklch(0.40 0.18 25)" }}>สินค้าบางรายการปิดการขายแล้ว</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.55 0.15 25)" }}>
                    กรุณาลบรายการที่ไฮไลต์สีแดงออก แล้วสั่งใหม่อีกครั้ง
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  unavailableIds.forEach(id => {
                    const item = items.find(i => i.productId === id);
                    if (item) removeItem(cartKey(item.productId, item.options ?? []));
                  });
                  setUnavailableIds([]);
                  toast.success("ลบรายการที่ปิดขายออกแล้ว");
                }}
                className="mt-3 w-full h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: "oklch(0.55 0.22 25)", color: "white" }}>
                <Trash2 className="w-4 h-4" />
                ลบรายการที่ปิดขายออกทั้งหมด
              </button>
            </div>
          </div>
        )}

        {/* ── Order items ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: G.gradLt }}>
              <CupSoda className="w-4 h-4" style={{ color: G.primary }} />
            </div>
            <span className="font-bold text-sm text-gray-800">รายการสั่ง</span>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ background: G.grad }}>
              {items.reduce((s, i) => s + i.quantity, 0)} รายการ
            </span>
          </div>
          <div className="px-4 pb-4 space-y-3 mt-1">
            {items.map((item, idx) => {
              const isUnavailable = unavailableIds.includes(item.productId);
              return (
                <div key={cartKey(item.productId, item.options ?? [])}>
                  <div className={`flex items-center gap-3 rounded-xl transition-all ${isUnavailable ? "p-2 -mx-2" : ""}`}
                    style={isUnavailable ? { background: "oklch(0.97 0.03 25)", border: "1.5px solid oklch(0.88 0.10 25)" } : {}}>
                    {/* Product image */}
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100 relative">
                      {item.image ? (
                        <Image src={item.image} alt={item.name} width={56} height={56} className={`w-full h-full object-cover ${isUnavailable ? "opacity-40" : ""}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ background: G.gradLt }}>
                          <CupSoda className="w-6 h-6" style={{ color: G.primary }} />
                        </div>
                      )}
                      {isUnavailable && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5" style={{ color: "oklch(0.55 0.22 25)" }} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isUnavailable ? "" : "text-gray-800"}`}
                        style={isUnavailable ? { color: "oklch(0.40 0.18 25)" } : {}}>
                        {item.name}
                      </p>
                      {isUnavailable && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5"
                          style={{ background: "oklch(0.55 0.22 25)", color: "white" }}>
                          ปิดการขาย
                        </span>
                      )}
                      {!isUnavailable && item.options && item.options.length > 0 && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {item.options.map(o => o.optionName).join(", ")}
                        </p>
                      )}
                      {!isUnavailable && (
                        <p className="text-xs text-gray-400 mt-0.5">x{item.quantity} × {formatPrice(item.price)}</p>
                      )}
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${isUnavailable ? "line-through opacity-40" : ""}`}
                      style={{ color: isUnavailable ? "oklch(0.55 0.22 25)" : G.primary }}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                  {idx < items.length - 1 && <div className="mt-3 border-t border-dashed border-gray-100" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Points ── */}
        {loyalty > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <span className="font-bold text-sm text-gray-800">แต้มสะสม</span>
                <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {loyalty} แต้ม
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-2.5">100 แต้ม = ลด 1 บาท</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="ใส่จำนวนแต้ม"
                  value={pointsToUse || ""}
                  onChange={(e) => setPointsToUse(Math.min(Number(e.target.value), loyalty))}
                  className="flex-1 h-10 rounded-xl text-sm border-gray-200"
                  inputMode="numeric"
                />
                <button
                  onClick={() => setPointsToUse(loyalty)}
                  className="px-4 h-10 rounded-xl text-sm font-semibold flex-shrink-0"
                  style={{ background: G.gradLt, color: G.primary, border: "1px solid oklch(0.88 0.08 162)" }}
                >
                  ใช้ทั้งหมด
                </button>
              </div>
              {pointsToUse > 0 && (
                <p className="text-xs mt-2 font-semibold" style={{ color: G.primary }}>
                  ลด {formatPrice(pointsDiscount)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Payment ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #dbeafe, #bfdbfe)" }}>
                <Star className="w-4 h-4 text-blue-500" />
              </div>
              <span className="font-bold text-sm text-gray-800">วิธีชำระเงิน</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {([
                { value: "QR_PROMPTPAY", label: "QR PromptPay", sub: "สแกนจ่ายทันที", Icon: Smartphone },
                { value: "COD",          label: "ชำระหน้าร้าน", sub: "จ่ายตอนรับของ",  Icon: Wallet },
              ] as const).map((m) => {
                const active = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all",
                      active
                        ? "border-primary/60 shadow-sm"
                        : "border-gray-100 bg-gray-50"
                    )}
                    style={active ? { background: G.gradLt } : {}}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      active ? "bg-white shadow-sm" : "bg-white"
                    )}>
                      <m.Icon className={cn("w-5 h-5", active ? "text-primary" : "text-gray-400")}
                        style={active ? { color: G.primary } : {}} />
                    </div>
                    <p className={cn("text-xs font-bold", active ? "text-gray-800" : "text-gray-500")}>{m.label}</p>
                    <p className="text-[10px] text-gray-400">{m.sub}</p>
                    {active && (
                      <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: G.primary }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Note ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.96 0.015 60)" }}>
                <PenLine className="w-4 h-4 text-amber-500" />
              </div>
              <span className="font-bold text-sm text-gray-800">หมายเหตุ</span>
            </div>
            <Input
              placeholder="หมายเหตุถึงร้าน เช่น หวานน้อย ไม่ใส่น้ำแข็ง..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-11 rounded-xl text-sm border-gray-200 bg-gray-50"
            />
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div className="px-4 py-4 space-y-2.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>ยอดสินค้า ({items.reduce((s, i) => s + i.quantity, 0)} รายการ)</span>
              <span className="font-semibold text-gray-700">{formatPrice(subtotal)}</span>
            </div>
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600">แต้มสะสม ({pointsToUse} แต้ม)</span>
                <span className="font-semibold text-amber-600">-{formatPrice(pointsDiscount)}</span>
              </div>
            )}
            <div className="border-t border-dashed border-gray-100 pt-2.5 flex justify-between">
              <span className="font-bold text-base text-gray-800">ยอดรวมทั้งสิ้น</span>
              <span className="font-black text-xl" style={{ color: G.primary }}>{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Submit button (always visible at bottom) ── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-6 bg-gray-50" style={{ boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}>
        <button
          onClick={handleSubmit}
          disabled={loading || unavailableIds.length > 0}
          className="w-full h-14 rounded-2xl text-base font-black text-white disabled:opacity-60 transition-opacity active:opacity-80"
          style={{ background: unavailableIds.length > 0 ? "oklch(0.70 0 0)" : G.grad, boxShadow: unavailableIds.length > 0 ? "none" : G.shadow }}
        >
          {loading ? "กำลังสั่ง..." : unavailableIds.length > 0 ? "กรุณาลบสินค้าที่ปิดขายก่อน" : `สั่งแล้วมารับ — ${formatPrice(grandTotal)}`}
        </button>
      </div>
    </div>
  );
}
