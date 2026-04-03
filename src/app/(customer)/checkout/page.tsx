"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft, MapPin, Tag, CheckCircle, Plus, ShoppingBag, Truck,
  Ticket, Star, CreditCard, PenLine, Store, Bike, Smartphone, Wallet, X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import AddressFormDialog from "@/components/customer/address-form-dialog";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Address, DeliveryZone } from "@/types";
import Link from "next/link";

type PaymentMethod = "QR_PROMPTPAY" | "COD";
type OrderType = "DELIVERY" | "PICKUP";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, total, clearCart } = useCartStore();
  const queryClient = useQueryClient();

  const [orderType, setOrderType] = useState<OrderType>("PICKUP");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QR_PROMPTPAY");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponName, setCouponName] = useState("");
  const [pointsToUse, setPointsToUse] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [addAddrOpen, setAddAddrOpen] = useState(false);

  const subtotal = total();
  const isPickup = orderType === "PICKUP";

  const { data: addresses = [], isLoading: addrLoading } = useQuery<Address[]>({
    queryKey: ["addresses"],
    queryFn: () => fetch("/api/addresses").then((r) => r.json()).then((d) => d.data),
    enabled: !!user,
  });

  const handleAddressSaved = async (addressId: string) => {
    await queryClient.invalidateQueries({ queryKey: ["addresses"] });
    setSelectedAddress(addressId);
  };

  const { data: zones = [], isLoading: zoneLoading } = useQuery<DeliveryZone[]>({
    queryKey: ["delivery-zones"],
    queryFn: () => fetch("/api/zones").then((r) => r.json()).then((d) => d.data),
  });

  const { data: shopSettings } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: () => fetch("/api/shop-settings").then((r) => r.json()).then((d) => d.data),
  });

  const { data: availableCoupons = [] } = useQuery<{ id: string; code: string; name: string; type: string; value: number; minOrderAmount: number; expiresAt: string | null }[]>({
    queryKey: ["available-coupons"],
    queryFn: () => fetch("/api/home").then((r) => r.json()).then((d) => d.activePromos ?? []),
  });

  useEffect(() => {
    const def = addresses.find((a) => a.isDefault);
    if (def) setSelectedAddress(def.id);
  }, [addresses]);

  useEffect(() => {
    if (zones.length > 0) setSelectedZone(zones[0].id);
  }, [zones]);

  const zone = zones.find((z) => z.id === selectedZone);
  const deliveryFee = isPickup ? 0 : (zone?.deliveryFee ?? 0);
  const loyalty = user?.pointsBalance ?? 0;
  const pointsDiscount = Math.floor(pointsToUse / 100);
  const grandTotal = Math.max(0, subtotal - couponDiscount - pointsDiscount + deliveryFee);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch(`/api/coupons?code=${couponCode}&subtotal=${subtotal}`);
      const data = await res.json();
      if (!data.success) { toast.error(data.error); return; }
      setCouponDiscount(data.data.discountAmount);
      setCouponName(data.data.coupon.name);
      toast.success(`ใช้โค้ด "${couponCode}" ส่วนลด ${formatPrice(data.data.discountAmount)}`);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isPickup && !selectedAddress) { toast.error("กรุณาเลือกที่อยู่จัดส่ง"); return; }
    if (!isPickup && !selectedZone) { toast.error("กรุณาเลือกโซนจัดส่ง"); return; }
    if (items.length === 0) { toast.error("ตะกร้าสินค้าว่างเปล่า"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderType,
          addressId: isPickup ? undefined : selectedAddress,
          deliveryZoneId: isPickup ? undefined : selectedZone,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note })),
          paymentMethod,
          couponCode: couponName ? couponCode : undefined,
          pointsToUse,
          note,
        }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error); return; }

      clearCart();
      toast.success("สั่งอาหารสำเร็จ!");

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
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-8 text-center bg-background">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-muted">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold">ตะกร้าว่างเปล่า</h2>
        <p className="text-muted-foreground text-sm">เพิ่มสินค้าก่อนทำการสั่งซื้อ</p>
        <Link href="/menu"><Button className="w-full">ไปที่เมนูอาหาร</Button></Link>
      </div>
    );
  }

  const canSubmit = isPickup || (!!selectedAddress && !!selectedZone);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.push("/cart")} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-lg">สั่งอาหาร</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4 pb-4">

        {/* Order type toggle — PICKUP first (primary) */}
        <div className="bg-card rounded-2xl p-1.5 flex gap-1.5">
          <button
            onClick={() => setOrderType("PICKUP")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all",
              orderType === "PICKUP"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Store className="w-4 h-4" />
            รับหน้าร้าน
          </button>
          <button
            onClick={() => setOrderType("DELIVERY")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all",
              orderType === "DELIVERY"
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bike className="w-4 h-4" />
            จัดส่งถึงบ้าน
          </button>
        </div>

        {/* Pickup info card — prominent */}
        {isPickup && (
          <div className="rounded-2xl overflow-hidden border border-primary/20"
            style={{ background: "linear-gradient(135deg, oklch(0.97 0.04 148) 0%, oklch(0.94 0.06 148) 100%)" }}>
            <div className="p-4 flex gap-3 items-start">
              <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800">{shopSettings?.name ?? "ช่วงเวลาคาเฟ่"}</p>
                {shopSettings?.address && (
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{shopSettings.address}</p>
                )}
                {shopSettings?.phone && (
                  <p className="text-xs mt-1 font-medium text-primary">{shopSettings.phone}</p>
                )}
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary text-white flex-shrink-0">
                ฟรี
              </span>
            </div>
            <div className="px-4 pb-3 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="text-xs text-gray-600">ร้านจะแจ้งเตือนเมื่อออเดอร์พร้อมรับ</span>
            </div>
          </div>
        )}

        {/* Order items */}
        <Section title="รายการสั่ง" icon={ShoppingBag}>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="flex-1">{item.name} x{item.quantity}</span>
                <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Address — Delivery only */}
        {!isPickup && (
          <Section title="ที่อยู่จัดส่ง" icon={MapPin}>
            {addrLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : addresses.length === 0 ? (
              <Button variant="outline" className="w-full" size="sm" onClick={() => setAddAddrOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> เพิ่มที่อยู่ใหม่
              </Button>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border-2 transition-colors",
                      selectedAddress === addr.id ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{addr.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{addr.fullAddress}</p>
                      </div>
                      {selectedAddress === addr.id && (
                        <CheckCircle className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
                <Button variant="ghost" size="sm" className="w-full text-primary" onClick={() => setAddAddrOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> เพิ่มที่อยู่ใหม่
                </Button>
              </div>
            )}
          </Section>
        )}

        {/* Delivery zone — Delivery only */}
        {!isPickup && (
          <Section title="โซนจัดส่ง" icon={Truck}>
            {zoneLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZone(z.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border-2 transition-colors flex items-center justify-between",
                      selectedZone === z.id ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{z.name}</p>
                      {z.description && <p className="text-xs text-muted-foreground">{z.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{formatPrice(z.deliveryFee)}</span>
                      {selectedZone === z.id && <CheckCircle className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Coupon */}
        <div className="rounded-2xl overflow-hidden border border-amber-200" style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" }}>
          <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-amber-800">โค้ดส่วนลด</span>
            {availableCoupons.length > 0 && !couponName && (
              <span className="ml-auto text-[10px] text-amber-600 font-medium">{availableCoupons.length} โค้ดพร้อมใช้</span>
            )}
          </div>

          {/* Quick-tap available coupons */}
          {availableCoupons.length > 0 && !couponName && (
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {availableCoupons.map((c) => {
                const eligible = subtotal >= c.minOrderAmount;
                const label = c.type === "PERCENT" ? `ลด ${c.value}%` : `ลด ฿${c.value}`;
                return (
                  <button
                    key={c.id}
                    onClick={() => { if (eligible) { setCouponCode(c.code); setCouponDiscount(0); setCouponName(""); } }}
                    disabled={!eligible}
                    className={cn(
                      "flex-shrink-0 flex flex-col items-start px-3 py-2 rounded-xl border transition-all",
                      eligible
                        ? "bg-white border-amber-300 active:scale-95"
                        : "bg-white/50 border-amber-100 opacity-50"
                    )}
                  >
                    <span className="font-black text-sm" style={{ color: eligible ? "oklch(0.68 0.20 148)" : "#9ca3af" }}>{label}</span>
                    <span className="font-mono text-[10px] font-bold text-gray-500 tracking-wider">{c.code}</span>
                    {!eligible && c.minOrderAmount > 0 && (
                      <span className="text-[9px] text-gray-400">ขั้นต่ำ {formatPrice(c.minOrderAmount)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Input row */}
          <div className="px-4 pb-3.5 flex gap-2">
            {couponName ? (
              <div className="flex-1 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-700 truncate">{couponName}</p>
                  <p className="text-[11px] text-green-600">ลด {formatPrice(couponDiscount)}</p>
                </div>
                <button
                  onClick={() => { setCouponCode(""); setCouponDiscount(0); setCouponName(""); }}
                  className="text-green-400 hover:text-green-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="พิมพ์หรือเลือกโค้ด..."
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponDiscount(0); setCouponName(""); }}
                  className="flex-1 uppercase bg-white border-amber-200 focus-visible:ring-amber-300"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode}
                  className="bg-amber-400 hover:bg-amber-500 text-white border-0 font-semibold px-4"
                >
                  {couponLoading ? "..." : "ใช้"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Points */}
        {loyalty > 0 && (
          <Section title={`แต้มสะสม (มี ${loyalty} แต้ม)`} icon={Star}>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">100 แต้ม = ลด 1 บาท | ใช้ได้สูงสุด 20% ของยอดสั่ง</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={pointsToUse || ""}
                  onChange={(e) => setPointsToUse(Math.min(Number(e.target.value), loyalty))}
                  className="flex-1"
                  inputMode="numeric"
                />
                <Button onClick={() => setPointsToUse(loyalty)} variant="outline" size="sm">ใช้ทั้งหมด</Button>
              </div>
              {pointsToUse > 0 && (
                <p className="text-sm text-primary">ลด {formatPrice(pointsDiscount)}</p>
              )}
            </div>
          </Section>
        )}

        {/* Payment method */}
        <Section title="วิธีชำระเงิน" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "QR_PROMPTPAY", label: "QR PromptPay", Icon: Smartphone },
              { value: "COD", label: isPickup ? "ชำระหน้าร้าน" : "เงินสดปลายทาง", Icon: Wallet },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value as PaymentMethod)}
                className={cn(
                  "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors",
                  paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <m.Icon className={cn("w-6 h-6", paymentMethod === m.value ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Note */}
        <Section title="หมายเหตุ" icon={PenLine}>
          <Input
            placeholder="หมายเหตุถึงร้าน (ถ้ามี)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Section>

        {/* Summary */}
        <div className="bg-card rounded-2xl p-4 space-y-2">
          <SummaryRow label="ยอดสินค้า" value={formatPrice(subtotal)} />
          {couponDiscount > 0 && <SummaryRow label={`ส่วนลด (${couponCode})`} value={`-${formatPrice(couponDiscount)}`} highlight />}
          {pointsDiscount > 0 && <SummaryRow label={`แต้มสะสม (${pointsToUse} แต้ม)`} value={`-${formatPrice(pointsDiscount)}`} highlight />}
          {!isPickup && <SummaryRow label={`ค่าส่ง (${zone?.name ?? ""})`} value={formatPrice(deliveryFee)} />}
          {isPickup && <SummaryRow label="ค่าส่ง" value="ฟรี (รับหน้าร้าน)" highlight />}
          <Separator />
          <SummaryRow label="ยอดรวมทั้งสิ้น" value={formatPrice(grandTotal)} bold />
        </div>
      </div>

      {/* Add Address Dialog */}
      <AddressFormDialog
        open={addAddrOpen}
        onOpenChange={setAddAddrOpen}
        onSaved={handleAddressSaved}
      />

      {/* Submit */}
      <div className="sticky bottom-0 px-4 pt-3 bg-card border-t border-border" style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
        <Button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          className="w-full h-14 text-base font-bold rounded-2xl shadow-lg shadow-primary/30"
        >
          {loading ? "กำลังสั่ง..." : `${isPickup ? "สั่งแล้วมารับ" : "สั่งจัดส่ง"} ${formatPrice(grandTotal)}`}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
        <Icon className="w-4 h-4 text-primary opacity-70" /> {title}
      </h3>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, highlight, bold }: { label: string; value: string; highlight?: boolean; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between text-sm", bold && "font-bold text-base")}>
      <span className={highlight ? "text-green-600" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "text-green-600" : bold ? "text-primary" : ""}>{value}</span>
    </div>
  );
}
