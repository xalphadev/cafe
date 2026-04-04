"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Minus, X, ChevronUp, ChevronDown, UtensilsCrossed } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCartStore, cartKey } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { SelectedOption, ProductWithCategory, ProductOptionGroup } from "@/types";
import { toast } from "sonner";

const G = {
  primary:    "oklch(0.72 0.22 152)",
  primaryDk:  "oklch(0.55 0.22 155)",
  primaryLt:  "oklch(0.93 0.07 152)",
  primaryXlt: "oklch(0.976 0.018 152)",
  fg:         "oklch(0.18 0.022 145)",
  fgMuted:    "oklch(0.50 0.04 152)",
  border:     "oklch(0.93 0.012 152)",
  grad:       "linear-gradient(160deg, oklch(0.72 0.22 152) 0%, oklch(0.55 0.22 155) 100%)",
  shadow:     "0 8px 28px oklch(0.65 0.20 152 / 0.28)",
};

interface Props {
  product: ProductWithCategory | null;
  open: boolean;
  onClose: () => void;
  /** when set, sheet is in edit mode: pre-fill and update the cart item */
  editKey?: string;
  initialOptions?: SelectedOption[];
  initialNote?: string;
  initialQty?: number;
}

export function ProductDetailSheet({ product, open, onClose, editKey, initialOptions, initialNote, initialQty }: Props) {
  const { addItem, removeItem, updateQuantity } = useCartStore();
  const isEdit = !!editKey;
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!product) return;
    // Build initial selections from initialOptions (edit mode) or defaults (add mode)
    const defaults: Record<string, string[]> = {};
    const collapseState: Record<string, boolean> = {};
    (product.optionGroups ?? []).forEach((g: any) => {
      if (isEdit && initialOptions) {
        defaults[g.id] = initialOptions.filter(o => o.groupId === g.id).map(o => o.optionId);
        collapseState[g.id] = defaults[g.id].length > 0;
      } else {
        const def = g.options.filter((o: any) => o.isDefault).map((o: any) => o.id);
        defaults[g.id] = def.length > 0 ? [def[0]] : [];
        collapseState[g.id] = false;
      }
    });
    setSelected(defaults);
    setCollapsed(collapseState);
    setQty(isEdit && initialQty ? initialQty : 1);
    setNote(isEdit && initialNote ? initialNote : "");
  }, [product, isEdit, initialOptions, initialNote, initialQty]);

  if (!product) return null;

  const groups = (product.optionGroups ?? []) as any[];

  const toggleOption = (group: any, optionId: string) => {
    setSelected(prev => {
      const cur = prev[group.id] ?? [];
      let next: string[];
      if (group.maxChoices === 1) {
        next = cur[0] === optionId ? [] : [optionId];
      } else if (cur.includes(optionId)) {
        next = cur.filter((id: string) => id !== optionId);
      } else {
        if (cur.length >= group.maxChoices) {
          toast.error(`เลือกได้สูงสุด ${group.maxChoices} ตัวเลือก`);
          return prev;
        }
        next = [...cur, optionId];
      }

      return { ...prev, [group.id]: next };
    });
  };

  const optionsPrice = groups.reduce((sum: number, g: any) => {
    const sel = selected[g.id] ?? [];
    return sum + g.options.filter((o: any) => sel.includes(o.id)).reduce((s: number, o: any) => s + o.priceAdded, 0);
  }, 0);

  const unitPrice  = product.price + optionsPrice;
  const totalPrice = unitPrice * qty;

  const missingRequired = groups
    .filter((g: any) => g.isRequired && (selected[g.id]?.length ?? 0) === 0)
    .map((g: any) => g.name);

  const handleAddToCart = () => {
    if (missingRequired.length > 0) {
      const firstMissing = groups.find((g: any) => g.isRequired && (selected[g.id]?.length ?? 0) === 0);
      if (firstMissing) {
        setCollapsed(c => ({ ...c, [firstMissing.id]: false }));
        setTimeout(() => {
          groupRefs.current[firstMissing.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
      toast.error(`กรุณาเลือก: ${missingRequired.join(", ")}`);
      return;
    }
    const selectedOptions: SelectedOption[] = groups.flatMap((g: any) =>
      (selected[g.id] ?? []).map((optId: string) => {
        const opt = g.options.find((o: any) => o.id === optId)!;
        return { groupId: g.id, groupName: g.name, optionId: optId, optionName: opt.name, priceAdded: opt.priceAdded };
      })
    );
    if (isEdit && editKey) {
      removeItem(editKey);
      addItem({ productId: product.id, name: product.name, price: product.price, image: product.image ?? null, options: selectedOptions, note });
      // set correct qty (addItem defaults to 1)
      if (qty > 1) {
        const newKey = cartKey(product.id, selectedOptions);
        updateQuantity(newKey, qty);
      }
      toast.success("อัปเดต " + product.name + " แล้ว", { duration: 1500 });
    } else {
      for (let i = 0; i < qty; i++) {
        addItem({ productId: product.id, name: product.name, price: product.price, image: product.image ?? null, options: selectedOptions, note });
      }
      toast.success("เพิ่ม " + product.name + (qty > 1 ? " ×" + qty : "") + " ลงตะกร้าแล้ว", { duration: 1500 });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="p-0 rounded-t-[2rem] flex flex-col overflow-hidden border-0 [&>button]:hidden"
        style={{ maxHeight: "92vh", backgroundColor: "#f8f8f8" }}
      >
        {/* ── Hero Image ── */}
        <div className="relative w-full flex-shrink-0" style={{ height: 220 }}>
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="100vw" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <UtensilsCrossed className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)" }} />

          {/* Close button — single, top-left */}
          <button onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}>
            <X className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

          {/* Product name + price card */}
          <div className="bg-white px-5 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-extrabold leading-tight" style={{ color: G.fg }}>{product.name}</h2>
                {product.description && (
                  <p className="text-[13px] mt-1 leading-relaxed" style={{ color: G.fgMuted }}>{product.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[11px] font-medium mb-0.5" style={{ color: G.fgMuted }}>ราคาเริ่มต้น</p>
                <p className="text-xl font-extrabold" style={{ color: G.primary }}>{formatPrice(product.price)}</p>
              </div>
            </div>
          </div>

          {/* ── Option Groups ── */}
          {groups.map((group: any, idx: number) => {
            const sel = selected[group.id] ?? [];
            const isFulfilled = sel.length > 0;
            const isCollapsed = collapsed[group.id] ?? false;
            const selectedNames = sel.map((id: string) => group.options.find((o: any) => o.id === id)?.name).filter(Boolean);

            return (
              <div key={group.id} ref={el => { groupRefs.current[group.id] = el; }}
                className="bg-white mt-2" style={{ borderBottom: "1px solid #f0f0f0" }}>

                {/* Group Header — tap to collapse/expand */}
                <button
                  className="w-full px-5 py-4 flex items-start justify-between gap-3 active:bg-gray-50 transition-colors"
                  onClick={() => setCollapsed(c => ({ ...c, [group.id]: !c[group.id] }))}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[15px]" style={{ color: G.fg }}>{group.name}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={isFulfilled && group.isRequired
                          ? { background: G.primaryLt, color: G.primary }
                          : group.isRequired
                            ? { background: "oklch(0.96 0.10 25)", color: "oklch(0.50 0.22 25)" }
                            : { background: "oklch(0.94 0.02 152)", color: G.fgMuted }
                        }
                      >
                        {isFulfilled && group.isRequired ? "เลือกแล้ว"
                          : group.isRequired ? "ต้องระบุ"
                          : "ไม่บังคับ"}
                      </span>
                    </div>
                    <p className="text-[12px] mt-0.5" style={{ color: G.fgMuted }}>
                      {group.maxChoices === 1
                        ? "กรุณาเลือก 1 ข้อ"
                        : ("เลือกได้สูงสุด " + group.maxChoices + " ข้อ")}
                    </p>
                    {/* Show selected summary when collapsed */}
                    {isCollapsed && selectedNames.length > 0 && (
                      <p className="text-[12px] font-semibold mt-1" style={{ color: G.primary }}>
                        {selectedNames.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-0.5" style={{ color: G.fgMuted }}>
                    {isCollapsed
                      ? <ChevronDown className="w-5 h-5" />
                      : <ChevronUp className="w-5 h-5" />
                    }
                  </div>
                </button>

                {/* Options list (collapsible) */}
                {!isCollapsed && (
                  <div className="px-4 pb-3 space-y-1">
                    {group.options.map((opt: any) => {
                      const isSelected = sel.includes(opt.id);
                      return (
                        <button key={opt.id}
                          onClick={() => toggleOption(group, opt.id)}
                          className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-all active:scale-[0.99]"
                          style={{
                            background: isSelected ? "oklch(0.94 0.08 148)" : "transparent",
                            border: "1.5px solid " + (isSelected ? G.primary : "#e8e8e8"),
                          }}
                        >
                          {/* Radio indicator */}
                          <div
                            className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                            style={{
                              borderColor: isSelected ? G.primary : "#ccc",
                              background: isSelected ? G.primary : "white",
                            }}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <span className="flex-1 text-left text-[14px] font-medium" style={{ color: G.fg }}>
                            {opt.name}
                          </span>

                          <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: isSelected ? G.primary : G.fgMuted }}>
                            ฿{opt.priceAdded}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Note / Additional details ── */}
          <div className="bg-white mt-2 px-5 py-4 mb-2" style={{ borderBottom: "1px solid #f0f0f0" }}>
            <p className="font-extrabold text-[15px] mb-3" style={{ color: G.fg }}>รายละเอียดเพิ่มเติม</p>
            <div className="rounded-xl border px-4 py-3" style={{ borderColor: "#e0e0e0" }}>
              <textarea
                rows={2}
                placeholder="เช่น ไม่เอาผัก หวานน้อย ไม่ใส่น้ำแข็ง..."
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full text-sm outline-none resize-none bg-transparent leading-relaxed"
                style={{ color: G.fg }}
              />
            </div>
          </div>

          {/* Spacer for bottom bar */}
          <div className="h-4" />
        </div>

        {/* ── Bottom Action Bar ── */}
        <div className="flex-shrink-0 bg-white px-4 py-4"
          style={{ borderTop: "1px solid " + G.border, boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}>

          {/* Price breakdown */}
          {optionsPrice > 0 && (
            <div className="flex items-center justify-between text-xs mb-3 px-1" style={{ color: G.fgMuted }}>
              <span>{formatPrice(product.price)} + ตัวเลือก {formatPrice(optionsPrice)}</span>
              <span className="font-bold" style={{ color: G.primary }}>{formatPrice(unitPrice)} / ชิ้น</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Qty */}
            <div className="flex items-center gap-2 px-2 py-2 rounded-2xl flex-shrink-0"
              style={{ background: G.primaryXlt }}>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center transition-all active:scale-90"
                style={{ boxShadow: "0 1px 4px oklch(0.60 0.18 148 / 0.14)" }}
              >
                <Minus className="w-4 h-4" style={{ color: G.primary }} strokeWidth={2.5} />
              </button>
              <span className="text-lg font-extrabold w-8 text-center tabular-nums" style={{ color: G.fg }}>{qty}</span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
                style={{ background: G.primary, color: "white", boxShadow: "0 3px 10px oklch(0.65 0.20 152 / 0.28)" }}
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              className="flex-1 rounded-2xl font-bold text-[15px] flex items-center justify-between px-5 transition-all active:scale-[0.97]"
              style={{
                background: missingRequired.length > 0 ? "oklch(0.78 0.13 152)" : G.grad,
                color: "white",
                boxShadow: missingRequired.length > 0 ? "none" : G.shadow,
                height: "3.25rem",
              }}
            >
              <span>{isEdit ? "อัปเดต" : "ใส่ตะกร้า"}</span>
              <span className="text-base font-extrabold">{formatPrice(totalPrice)}</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
