"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Search, Plus, Minus, ShoppingBag, MapPin, ChevronLeft, ChevronRight, Coffee, UtensilsCrossed, Star, AlertCircle, SlidersHorizontal, Store, Heart } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore, cartKey } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ProductWithCategory, Category, Banner, ShopSetting } from "@/types";
import { ProductDetailSheet } from "@/components/customer/product-detail-sheet";
import { useFavorites } from "@/hooks/useFavorites";

// Grab-green palette tokens
const G = {
  primary:    "oklch(0.64 0.24 162)",
  primaryDk:  "oklch(0.50 0.20 196)",
  primaryLt:  "oklch(0.93 0.09 162)",
  primaryXlt: "oklch(0.975 0.018 162)",
  fg:         "oklch(0.13 0.02 162)",
  fgMuted:    "oklch(0.50 0.04 162)",
  border:     "oklch(0.93 0.016 162)",
  bg:         "oklch(0.955 0.020 162)",
  card:       "oklch(0.995 0.003 162)",
  grad:       "linear-gradient(160deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)",
  gradLight:  "linear-gradient(160deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)",
  shadow:     "0 8px 24px oklch(0.55 0.22 145 / 0.28)",
  shadowSm:   "0 2px 12px oklch(0.63 0.18 145 / 0.14)",
};

export function MenuClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [detailProduct, setDetailProduct] = useState<ProductWithCategory | null>(null);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const { items, addItem, updateQuantity, total, itemCount, itemUnitPrice } = useCartStore();
  const { favoriteIds, favoriteProducts, toggle: toggleFavorite, isLoggedIn } = useFavorites();
  useEffect(() => setMounted(true), []);

  const { data: shopSetting } = useQuery<ShopSetting>({
    queryKey: ["shop-setting"],
    queryFn: () => fetch("/api/shop-settings").then(r => r.json()).then(d => d.data),
    refetchInterval: 60000,
  });

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: () => fetch("/api/banners").then(r => r.json()).then(d => d.data),
  });

  const { data: categories = [], isLoading: catLoading } = useQuery<(Category & { _count: { products: number } })[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then(r => r.json()).then(d => d.data),
  });

  const isFavTab = selectedCategory === "favorites";

  const { data: products = [], isLoading: prodLoading } = useQuery<ProductWithCategory[]>({
    queryKey: ["products", selectedCategory, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (selectedCategory !== "all") p.set("categoryId", selectedCategory);
      if (search) p.set("search", search);
      return fetch(`/api/products?${p}`).then(r => r.json()).then(d => d.data);
    },
    enabled: !isFavTab,
  });

  // Favorites tab: use cached data from useFavorites directly — no extra API call
  const displayProducts: ProductWithCategory[] = isFavTab
    ? (search
        ? favoriteProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
        : favoriteProducts)
    : products;

  const shopClosed = shopSetting && !shopSetting.isOpen;
  const featuredProducts = displayProducts.filter((p) => (p as { isFeatured?: boolean }).isFeatured);

  const qty = (id: string) => items.filter(i => i.productId === id).reduce((s, i) => s + i.quantity, 0);

  const handleAdd = (product: ProductWithCategory) => {
    // If has options → open detail sheet
    if (product.optionGroups && product.optionGroups.length > 0) {
      setDetailProduct(product);
      return;
    }
    addItem({ productId: product.id, name: product.name, price: product.price, image: product.image ?? null, options: [] });
    toast.success(`เพิ่ม  แล้ว`, { duration: 1200 });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="sticky-header bg-white" style={{ boxShadow: "0 1px 0 oklch(0.93 0.016 162)" }}>
        <div className="px-4 pt-4 pb-3">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Store className="w-3.5 h-3.5" style={{ color: G.primary }} />
                <span className="text-xs font-semibold" style={{ color: G.primary }}>รับหน้าร้าน</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight" style={{ color: G.fg }}>
                <span className="flex items-center gap-1.5"><Coffee className="w-5 h-5" style={{ color: G.primary }} /> ช่วงเวลาคาเฟ่</span>
              </h1>
            </div>

            {/* Cart icon — navigates to /cart */}
            <Link href="/cart">
              <span
                className="relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all active:scale-95 cursor-pointer"
                style={{ background: G.primaryXlt }}
              >
                <ShoppingBag className="w-5 h-5" style={{ color: G.primary }} />
                {mounted && itemCount() > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center px-1 text-white"
                    style={{ background: G.grad, boxShadow: "0 2px 6px oklch(0.55 0.22 145 / 0.4)" }}
                  >
                    {itemCount()}
                  </span>
                )}
              </span>
            </Link>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: G.fgMuted }} />
            <input
              type="search"
              placeholder="ค้นหาเมนูที่ชอบ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 rounded-2xl text-sm outline-none"
              style={{ background: G.primaryXlt, color: G.fg, border: `1.5px solid transparent` }}
              onFocus={e => (e.target.style.border = `1.5px solid ${G.primary}`)}
              onBlur={e => (e.target.style.border = `1.5px solid transparent`)}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div
          ref={categoryRef}
          className="flex gap-2 px-4 pb-3 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {/* Favorites tab — only for logged-in users */}
          {isLoggedIn && (
            <button
              onClick={() => setSelectedCategory("favorites")}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: selectedCategory === "favorites" ? "linear-gradient(135deg, oklch(0.62 0.22 15), oklch(0.50 0.24 12))" : "oklch(0.97 0.012 20)",
                color: selectedCategory === "favorites" ? "white" : "oklch(0.58 0.20 15)",
                boxShadow: selectedCategory === "favorites" ? "0 3px 10px oklch(0.55 0.22 15 / 0.30)" : "none",
                transform: selectedCategory === "favorites" ? "scale(1.03)" : "scale(1)",
              }}
            >
              <Heart className="w-3.5 h-3.5" fill={selectedCategory === "favorites" ? "white" : "oklch(0.58 0.20 15)"} strokeWidth={0} />
              โปรด
              {favoriteIds.size > 0 && (
                <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none"
                  style={{ background: selectedCategory === "favorites" ? "rgba(255,255,255,0.25)" : "oklch(0.62 0.22 15)", color: selectedCategory === "favorites" ? "white" : "white" }}>
                  {favoriteIds.size}
                </span>
              )}
            </button>
          )}

          {[{ id: "all", name: "ทั้งหมด" }, ...(!catLoading ? categories : [])].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap"
              style={{
                background: selectedCategory === cat.id ? G.grad : G.primaryXlt,
                color: selectedCategory === cat.id ? "white" : G.fgMuted,
                boxShadow: selectedCategory === cat.id ? "0 3px 10px oklch(0.55 0.22 145 / 0.25)" : "none",
                transform: selectedCategory === cat.id ? "scale(1.03)" : "scale(1)",
              }}
            >
              {cat.name}
            </button>
          ))}
          {catLoading && Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
      </header>

      {/* ── Shop Closed Banner — prominent sticky ── */}
      {shopClosed && (
        <div className="sticky top-[56px] z-30 mx-0">
          {/* Top red bar */}
          <div className="bg-red-500 px-4 py-2.5 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
            <p className="font-bold text-white text-sm flex-1">ร้านปิดให้บริการชั่วคราว — ยังไม่สามารถสั่งได้</p>
          </div>
          {/* Detail row */}
          <div className="bg-red-50 px-4 py-2 flex items-center justify-between border-b border-red-200">
            <p className="text-xs text-red-600">
              {shopSetting?.closedMessage || "ขออภัยในความไม่สะดวก"}
            </p>
            <p className="text-xs text-red-400 font-medium flex-shrink-0 ml-2">
              เปิด {shopSetting?.openTime ?? "08:00"}–{shopSetting?.closeTime ?? "22:00"} น.
            </p>
          </div>
        </div>
      )}

      {/* ── Banners ── */}
      {banners.length > 0 && (
        <div className="mx-4 mt-3 relative overflow-hidden rounded-2xl" style={{ aspectRatio: "2.5/1" }}>
          <Image
            src={banners[bannerIdx % banners.length].imageUrl}
            alt={banners[bannerIdx % banners.length].title ?? "Banner"}
            fill
            className="object-cover"
          />
          {banners.length > 1 && (
            <>
              <button onClick={() => setBannerIdx((i) => Math.max(0, i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={() => setBannerIdx((i) => Math.min(banners.length - 1, i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm">
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {banners.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full transition-all" style={{ background: i === bannerIdx % banners.length ? "white" : "rgba(255,255,255,0.4)" }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Featured Products ── */}
      {featuredProducts.length > 0 && !search && selectedCategory === "all" && (
        <div className="px-4 mt-4">
          <p className="font-bold text-sm mb-2 flex items-center gap-1.5" style={{ color: G.fg }}><Star className="w-4 h-4" style={{ color: "oklch(0.75 0.20 85)" }} /> เมนูแนะนำ</p>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {featuredProducts.map((p) => (
              <div
                key={p.id}
                className="flex-shrink-0 w-36 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all bg-white"
                style={{ boxShadow: "0 2px 10px oklch(0.55 0.18 145 / 0.10)" }}
                onClick={() => setDetailProduct(p)}
              >
                <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                  {p.image ? (
                    <Image src={p.image} alt={p.name} fill className="object-cover" sizes="144px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: G.primaryLt }}><UtensilsCrossed className="w-8 h-8" style={{ color: G.primary, opacity: 0.4 }} /></div>
                  )}
                </div>
                <div className="px-2 py-2">
                  <p className="text-xs font-bold line-clamp-1" style={{ color: G.fg }}>{p.name}</p>
                  <p className="text-xs font-extrabold mt-0.5" style={{ color: G.primary }}>{formatPrice(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Products ── */}
      <main className="flex-1 px-4 pt-4 pb-36">
        {(prodLoading && !isFavTab) ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {isFavTab ? (
              <>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: "oklch(0.97 0.012 20)" }}>
                  <Heart className="w-8 h-8" style={{ color: "oklch(0.68 0.20 15)", opacity: 0.4 }} />
                </div>
                <p className="font-bold" style={{ color: G.fg }}>ยังไม่มีเมนูโปรด</p>
                <p className="text-sm mt-1" style={{ color: G.fgMuted }}>กดไอคอนหัวใจบนเมนูที่ชอบ</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: G.primaryLt }}><Search className="w-8 h-8" style={{ color: G.primary, opacity: 0.5 }} /></div>
                <p className="font-bold" style={{ color: G.fg }}>ไม่พบเมนูที่ค้นหา</p>
                <p className="text-sm mt-1" style={{ color: G.fgMuted }}>ลองใช้คำค้นอื่น</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                qty={qty(product.id)}
                shopClosed={!!shopClosed}
                isFavorited={favoriteIds.has(product.id)}
                onFavorite={isLoggedIn ? () => toggleFavorite(product.id) : undefined}
                onOpen={() => setDetailProduct(product)}
                onAdd={() => !shopClosed && handleAdd(product)}
                onIncrease={() => !shopClosed && handleAdd(product)}
                onDecrease={() => {
                  const cartItems = items.filter(i => i.productId === product.id);
                  if (cartItems.length > 0) {
                    const last = cartItems[cartItems.length - 1];
                    updateQuantity(cartKey(last.productId, last.options ?? []), last.quantity - 1);
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Checkout bar ── */}
      {mounted && itemCount() > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-30 px-4 pb-2">
          <Link href="/cart">
            <div
              className="w-full h-14 rounded-2xl font-bold text-[15px] flex items-center justify-between px-5 active:scale-[0.98] transition-all"
              style={{ background: G.grad, color: "white", boxShadow: G.shadow }}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                ดูตะกร้า ({itemCount()} รายการ)
              </span>
              <span className="font-extrabold">{formatPrice(total())}</span>
            </div>
          </Link>
        </div>
      )}

      {/* ── Product Detail Sheet ── */}
      <ProductDetailSheet
        product={detailProduct}
        open={!!detailProduct}
        onClose={() => setDetailProduct(null)}
      />
    </div>
  );
}

/* ── Product Card ── */
function ProductCard({ product, qty, shopClosed, isFavorited, onFavorite, onOpen, onAdd, onIncrease, onDecrease }: {
  product: ProductWithCategory; qty: number; shopClosed: boolean;
  isFavorited?: boolean; onFavorite?: () => void;
  onOpen: () => void; onAdd: () => void; onIncrease: () => void; onDecrease: () => void;
}) {
  const hasOptions = product.optionGroups && product.optionGroups.length > 0;
  const salePrice = (product as { salePrice?: number | null }).salePrice;
  const saleEndsAt = (product as { saleEndsAt?: string | null }).saleEndsAt;
  const isSaleActive = salePrice && (!saleEndsAt || new Date(saleEndsAt) > new Date());

  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl bg-card active:scale-[0.97] transition-all cursor-pointer"
      style={{ boxShadow: "0 2px 12px oklch(0.55 0.18 145 / 0.12), 0 0 0 1px oklch(0.92 0.04 145)" }}
      onClick={onOpen}
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1/1" }}>
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover transition-transform duration-300 hover:scale-105" sizes="(max-width: 768px) 50vw, 200px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "oklch(0.93 0.09 162)" }}><UtensilsCrossed className="w-10 h-10 text-gray-300" /></div>
        )}
        {/* Gradient — light vignette only for readability */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.14) 0%, transparent 45%)" }} />

        {/* Category badge */}
        <span className="absolute top-2.5 left-2.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.88)", color: "oklch(0.50 0.20 196)", backdropFilter: "blur(6px)" }}>
          {product.category.name}
        </span>

        {/* Heart / Favorite button */}
        {onFavorite && (
          <button
            onClick={e => { e.stopPropagation(); onFavorite(); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all"
            style={{
              background: isFavorited ? "oklch(0.62 0.22 15)" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(6px)",
              boxShadow: isFavorited ? "0 2px 8px oklch(0.55 0.22 15 / 0.40)" : "0 1px 4px rgba(0,0,0,0.12)",
            }}
          >
            <Heart
              className="w-4 h-4 transition-all"
              fill={isFavorited ? "white" : "none"}
              stroke={isFavorited ? "none" : "oklch(0.62 0.22 15)"}
              strokeWidth={2}
            />
          </button>
        )}

        {/* In-cart badge */}
        {qty > 0 && (
          <span className="absolute bottom-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold"
            style={{ background: "oklch(0.64 0.24 162)", color: "white",
                     boxShadow: "0 2px 8px oklch(0.50 0.22 145 / 0.5)" }}>
            {qty}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-2.5 flex-1">
        <div className="flex-1">
          <h3 className="font-bold text-[13px] leading-snug line-clamp-2"
            style={{ color: "oklch(0.13 0.02 162)" }}>
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[11px] mt-0.5 line-clamp-1"
              style={{ color: "oklch(0.50 0.04 162)" }}>
              {product.description}
            </p>
          )}
          {hasOptions && (
            <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5"
              style={{ background: G.primaryXlt, color: G.fgMuted }}>
              ปรับแต่งได้
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            {isSaleActive ? (
              <div>
                <span className="font-extrabold text-sm" style={{ color: "oklch(0.52 0.22 25)" }}>
                  {formatPrice(salePrice!)}
                </span>
                <span className="text-[10px] line-through ml-1" style={{ color: "oklch(0.60 0.05 0)" }}>
                  {formatPrice(product.price)}
                </span>
              </div>
            ) : (
              <span className="font-extrabold text-sm" style={{ color: "oklch(0.64 0.24 162)" }}>
                {formatPrice(product.price)}
              </span>
            )}
            {hasOptions && <span className="text-[10px] ml-1" style={{ color: "oklch(0.60 0.05 145)" }}>ขึ้นไป</span>}
          </div>

          {/* Add/qty button — stop propagation so card click = open detail */}
          {shopClosed ? (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.93 0.01 0)", color: "oklch(0.65 0.01 0)" }}>
              <span className="text-[10px]">ปิด</span>
            </div>
          ) : qty === 0 ? (
            <button
              onClick={e => { e.stopPropagation(); onAdd(); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
              style={{ background: "linear-gradient(135deg, oklch(0.75 0.26 145) 0%, oklch(0.67 0.22 178) 50%, oklch(0.79 0.13 218) 100%)",
                       color: "white", boxShadow: "0 4px 12px oklch(0.55 0.22 145 / 0.35)" }}
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl px-1 py-1"
              style={{ background: "oklch(0.975 0.018 162)" }}
              onClick={e => e.stopPropagation()}>
              <button onClick={onDecrease}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center active:scale-90"
                style={{ boxShadow: "0 1px 3px oklch(0.55 0.18 145 / 0.15)" }}>
                <Minus className="w-3.5 h-3.5" style={{ color: "oklch(0.64 0.24 162)" }} strokeWidth={2.5} />
              </button>
              <span className="text-sm font-extrabold w-5 text-center" style={{ color: "oklch(0.13 0.02 162)" }}>{qty}</span>
              <button onClick={onIncrease}
                className="w-7 h-7 rounded-lg flex items-center justify-center active:scale-90"
                style={{ background: "oklch(0.64 0.24 162)", color: "white" }}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ── */
function ProductSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 8px oklch(0.63 0.18 145 / 0.08)" }}>
      <Skeleton className="w-full" style={{ aspectRatio: "4/3" }} />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-4/5 rounded-xl" />
        <Skeleton className="h-3 w-3/5 rounded-xl" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-5 w-14 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
