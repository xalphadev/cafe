"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ChevronRight, UtensilsCrossed, PenLine, Pencil } from "lucide-react";
import { useCartStore, cartKey } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { ProductDetailSheet } from "@/components/customer/product-detail-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CartItem } from "@/types";
import type { ProductWithCategory } from "@/types";

const G = {
  primary:    "oklch(0.49 0.152 150)",
  primaryDk:  "oklch(0.39 0.138 152)",
  primaryLt:  "oklch(0.80 0.098 148)",
  primaryXlt: "oklch(0.93 0.048 148)",
  fg:         "oklch(0.18 0.022 145)",
  fgMuted:    "oklch(0.52 0.052 150)",
  border:     "oklch(0.88 0.058 148)",
  bg:         "oklch(0.972 0.010 87)",
  grad:       "linear-gradient(160deg, oklch(0.49 0.152 150) 0%, oklch(0.39 0.138 152) 100%)",
  shadow:     "0 8px 24px oklch(0.39 0.12 152 / 0.28)",
};

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, total, itemCount, itemUnitPrice, clearCart } = useCartStore();

  const [editProduct, setEditProduct] = useState<ProductWithCategory | null>(null);
  const [editItem, setEditItem] = useState<CartItem | null>(null);
  const [editKey, setEditKey] = useState<string>("");
  const [loadingEdit, setLoadingEdit] = useState<string | null>(null);

  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  const handleEdit = async (item: CartItem, key: string) => {
    setLoadingEdit(key);
    try {
      const res = await fetch(`/api/products/${item.productId}`);
      const d = await res.json();
      if (d.success) {
        setEditProduct(d.data);
        setEditItem(item);
        setEditKey(key);
      }
    } finally {
      setLoadingEdit(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col min-h-screen pb-24 bg-background">
        <header className="sticky-header bg-white px-4 h-14 pt-2 flex items-center gap-3"
          style={{ borderBottom: `1px solid ${G.border}`, boxShadow: "0 1px 0 oklch(0.88 0.058 148)" }}>
          <button onClick={() => router.push("/menu")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: G.primaryLt }}>
            <ArrowLeft className="w-4.5 h-4.5" style={{ color: G.primary }} />
          </button>
          <h1 className="font-extrabold text-lg" style={{ color: G.fg }}>ตะกร้าสินค้า</h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-6xl"
            style={{ background: G.primaryLt, boxShadow: `0 8px 24px oklch(0.49 0.12 150 / 0.15)` }}>
            <ShoppingBag className="w-10 h-10" style={{ color: G.primary, opacity: 0.5 }} />
          </div>
          <div>
            <p className="font-extrabold text-xl" style={{ color: G.fg }}>ตะกร้าว่างเปล่า</p>
            <p className="text-sm mt-2" style={{ color: G.fgMuted }}>เพิ่มเมนูที่คุณชอบก่อนนะ</p>
          </div>
          <Link href="/menu">
            <div className="px-8 h-12 rounded-2xl font-bold text-sm flex items-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: G.grad, color: "white", boxShadow: G.shadow }}>
              <ShoppingBag className="w-4 h-4" />
              ดูเมนูสินค้า
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-40 bg-background">

      {/* ── Header ── */}
      <header className="sticky-header bg-white px-4 h-14 pt-2 flex items-center gap-3"
        style={{ borderBottom: `1px solid ${G.border}`, boxShadow: "0 1px 0 oklch(0.88 0.058 148)" }}>
        <button onClick={() => router.push("/menu")} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
          style={{ background: G.primaryLt }}>
          <ArrowLeft className="w-4 h-4" style={{ color: G.primary }} />
        </button>
        <div className="flex-1">
          <h1 className="font-extrabold text-[17px]" style={{ color: G.fg }}>ตะกร้าสินค้า</h1>
          <p className="text-[11px]" style={{ color: G.fgMuted }}>{itemCount()} รายการ</p>
        </div>
        <button onClick={() => setConfirmClear(true)}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
          style={{ color: "oklch(0.52 0.18 25)", background: "oklch(0.97 0.03 25)" }}>
          ล้างทั้งหมด
        </button>
      </header>

      <div className="px-4 pt-4 space-y-3">

        {/* ── Items ── */}
        {items.map((item) => {
          const key = cartKey(item.productId, item.options ?? []);
          const unitPrice = itemUnitPrice(item);
          const lineTotal = unitPrice * item.quantity;

          return (
            <div key={key} className="bg-card rounded-3xl p-4 flex gap-3"
              style={{ boxShadow: "0 2px 12px oklch(0.39 0.12 152 / 0.08)", border: `1.5px solid ${G.border}` }}>

              {/* Image */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0"
                style={{ background: G.primaryLt }}>
                {item.image
                  ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" />
                  : <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-7 h-7 text-gray-300" /></div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] leading-snug line-clamp-2" style={{ color: G.fg }}>{item.name}</p>
                    {/* Options */}
                    {(item.options ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(item.options ?? []).map(o => (
                          <span key={o.optionId} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: G.primaryLt, color: G.primaryDk }}>
                            {o.optionName}
                            {o.priceAdded > 0 && ` +${o.priceAdded}`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <p className="text-[11px] mt-1 italic line-clamp-1" style={{ color: G.fgMuted }}><PenLine className="w-3 h-3 inline mr-1" />{item.note}</p>
                    )}
                  </div>

                  {/* Edit + Delete */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(item, key)}
                      disabled={loadingEdit === key}
                      className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                      style={{ background: G.primaryLt, color: G.primary }}>
                      {loadingEdit === key
                        ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <Pencil className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setConfirmDeleteKey(key)}
                      className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: "oklch(0.97 0.03 25)", color: "oklch(0.58 0.20 25)" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price + Qty */}
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <span className="font-extrabold text-base" style={{ color: G.primary }}>
                      {formatPrice(lineTotal)}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] ml-1.5" style={{ color: G.fgMuted }}>
                        {formatPrice(unitPrice)} × {item.quantity}
                      </span>
                    )}
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-2xl"
                    style={{ background: G.primaryXlt }}>
                    <button
                      onClick={() => updateQuantity(key, item.quantity - 1)}
                      className="w-7 h-7 rounded-xl bg-white flex items-center justify-center active:scale-90 transition-transform"
                      style={{ boxShadow: "0 1px 4px oklch(0.39 0.12 152 / 0.12)" }}>
                      <Minus className="w-3.5 h-3.5" style={{ color: G.primary }} strokeWidth={2.5} />
                    </button>
                    <span className="text-[15px] font-extrabold w-6 text-center tabular-nums" style={{ color: G.fg }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(key, item.quantity + 1)}
                      className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                      style={{ background: G.primary, color: "white", boxShadow: "0 2px 8px oklch(0.49 0.12 150 / 0.28)" }}>
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* ── Add more ── */}
        <Link href="/menu">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-card active:scale-[0.99] transition-all"
            style={{ border: `1.5px dashed ${G.border}` }}>
            <span className="text-sm font-semibold" style={{ color: G.primary }}>+ เพิ่มรายการอาหาร</span>
            <ChevronRight className="w-4 h-4" style={{ color: G.fgMuted }} />
          </div>
        </Link>

        {/* ── Order Summary ── */}
        <div className="bg-card rounded-3xl p-4 mt-2"
          style={{ boxShadow: "0 2px 12px oklch(0.39 0.12 152 / 0.08)", border: `1.5px solid ${G.border}` }}>
          <h3 className="font-extrabold text-sm mb-3" style={{ color: G.fg }}>สรุปรายการ</h3>
          <div className="space-y-2">
            {items.map(item => {
              const key = cartKey(item.productId, item.options ?? []);
              return (
                <div key={key} className="flex justify-between text-[12px]" style={{ color: G.fgMuted }}>
                  <span className="truncate pr-2 flex-1">{item.name} × {item.quantity}</span>
                  <span className="flex-shrink-0 font-semibold">{formatPrice(itemUnitPrice(item) * item.quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: `1.5px solid ${G.border}` }}>
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold" style={{ color: G.fgMuted }}>รวมสินค้า</span>
              <span className="text-xl font-extrabold" style={{ color: G.fg }}>{formatPrice(total())}</span>
            </div>
            <p className="text-[10px] mt-1" style={{ color: G.fgMuted }}>* รับสินค้าหน้าร้านเท่านั้น</p>
          </div>
        </div>

      </div>

      {/* ── Confirm dialogs ── */}
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="ล้างตะกร้าสินค้า?"
        description="รายการทั้งหมดจะถูกลบออก ยืนยันหรือไม่?"
        confirmLabel="ล้างทั้งหมด"
        variant="danger"
        onConfirm={clearCart}
      />
      <ConfirmDialog
        open={!!confirmDeleteKey}
        onOpenChange={(o) => { if (!o) setConfirmDeleteKey(null); }}
        title="ลบรายการนี้?"
        description="รายการนี้จะถูกลบออกจากตะกร้า"
        confirmLabel="ลบ"
        variant="danger"
        onConfirm={() => { if (confirmDeleteKey) removeItem(confirmDeleteKey); }}
      />

      {/* ── Edit sheet ── */}
      <ProductDetailSheet
        product={editProduct}
        open={!!editProduct}
        onClose={() => { setEditProduct(null); setEditItem(null); setEditKey(""); }}
        editKey={editKey}
        initialOptions={editItem?.options}
        initialNote={editItem?.note}
        initialQty={editItem?.quantity}
      />

      {/* ── Bottom checkout bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-4"
        style={{ background: "oklch(1 0 0 / 0.96)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderTop: `1.5px solid ${G.border}`, paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>

        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-xs font-semibold" style={{ color: G.fgMuted }}>ยอดรวมสินค้า</p>
            <p className="text-2xl font-extrabold leading-tight" style={{ color: G.fg }}>{formatPrice(total())}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px]" style={{ color: G.fgMuted }}>{itemCount()} รายการ</p>
            <p className="text-[10px]" style={{ color: G.fgMuted }}>รับหน้าร้านเท่านั้น</p>
          </div>
        </div>

        <Link href="/checkout">
          <div
            className="w-full h-14 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            style={{ background: G.grad, color: "white", boxShadow: G.shadow }}
          >
            <ShoppingBag className="w-5 h-5" />
            ดำเนินการสั่งซื้อ
          </div>
        </Link>
      </div>

    </div>
  );
}
