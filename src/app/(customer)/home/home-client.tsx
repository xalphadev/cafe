"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import {
  Clock, ChevronRight, Tag, Zap, Star, TrendingUp,
  ShoppingBag, MapPin, ChevronLeft, Coffee, UtensilsCrossed,
  Trophy, Flame, Check, Copy, Store, Heart,
} from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import type { ProductWithCategory, Banner } from "@/types";
import { useFavorites } from "@/hooks/useFavorites";
import { ProductDetailSheet } from "@/components/customer/product-detail-sheet";

// ─── Design tokens ───────────────────────────────────────────────
const G = {
  primary:    "oklch(0.68 0.20 148)",
  primaryDk:  "oklch(0.46 0.17 150)",
  primaryLt:  "oklch(0.93 0.06 148)",
  primaryXlt: "oklch(0.976 0.016 148)",
  fg:         "oklch(0.13 0.02 148)",
  fgMuted:    "oklch(0.50 0.04 148)",
  border:     "oklch(0.93 0.016 148)",
  bg:         "oklch(0.955 0.022 148)",
  grad:       "linear-gradient(160deg, oklch(0.68 0.20 148) 0%, oklch(0.46 0.17 150) 100%)",
  gradDiag:   "linear-gradient(160deg, oklch(0.68 0.20 148) 0%, oklch(0.46 0.17 150) 100%)",
  shadow:     "0 8px 24px oklch(0.55 0.22 145 / 0.28)",
};

type HomeData = {
  banners: Banner[];
  shopSetting: { isOpen: boolean; openTime: string; closeTime: string; closedMessage: string };
  featuredProducts: (ProductWithCategory & { isFeatured: boolean })[];
  bestSellers: (ProductWithCategory & { totalSold: number })[];
  activePromos: { id: string; code: string; type: string; value: number; minOrderAmount: number; expiresAt: string | null; name: string }[];
  flashDeals: (ProductWithCategory & { salePrice: number; saleEndsAt: string | null })[];
};

function useCountdown(target: string | null) {
  const [remaining, setRemaining] = useState<number>(0);
  useEffect(() => {
    if (!target) return;
    const calc = () => Math.max(0, new Date(target).getTime() - Date.now());
    setRemaining(calc());
    const t = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(t);
  }, [target]);
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return remaining > 0 ? `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : null;
}

export default function HomeClient() {
  const [bannerIdx, setBannerIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [detailProduct, setDetailProduct] = useState<ProductWithCategory | null>(null);
  const { addItem, itemCount } = useCartStore();
  const { favoriteIds, toggle: toggleFavorite, isLoggedIn } = useFavorites();
  useEffect(() => setMounted(true), []);

  const { data } = useQuery<HomeData>({
    queryKey: ["home"],
    queryFn: () => fetch("/api/home").then((r) => r.json()).then((d) => d.data),
    staleTime: 10_000,
  });

  // Auto-advance banner (admin banners OR fallback product slides)
  const totalBannerSlides = data
    ? (data.banners.length > 0 ? data.banners.length : Math.min(data.featuredProducts.length, 4))
    : 0;
  useEffect(() => {
    if (totalBannerSlides <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % totalBannerSlides), 4500);
    return () => clearInterval(t);
  }, [totalBannerSlides]);

  const handleQuickAdd = useCallback((product: ProductWithCategory) => {
    setDetailProduct(product);
  }, []);

  const count = mounted ? itemCount() : 0;
  const shopOpen = data?.shopSetting?.isOpen ?? true;

  return (
    <>
    <div className="flex flex-col min-h-screen pb-24 bg-background">

      {/* ── Hero Header ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: shopOpen ? G.gradDiag : "linear-gradient(160deg, #374151 0%, #1f2937 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-10" style={{ background: "white" }} />

        <div className="relative px-5 pt-12 pb-6">
          {/* Shop status chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4"
            style={{ background: shopOpen ? "rgba(255,255,255,0.18)" : "rgba(239,68,68,0.25)" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${shopOpen ? "bg-green-300 animate-pulse" : "bg-red-400"}`} />
            <span className="text-[11px] font-semibold text-white">
              {shopOpen ? "เปิดให้บริการแล้ว" : "ปิดร้านชั่วคราว"}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight flex items-center gap-2">
            <Coffee className="w-7 h-7 opacity-90" />
            ช่วงเวลาคาเฟ่
          </h1>
          <p className="text-sm text-white/70 mt-1">เครื่องดื่มและของหวานสดใหม่ ส่งถึงบ้าน</p>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <Clock className="w-3.5 h-3.5" />
              <span>{data?.shopSetting.openTime ?? "08:00"} – {data?.shopSetting.closeTime ?? "22:00"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/80 text-xs">
              <Store className="w-3.5 h-3.5" />
              <span>รับหน้าร้าน / จัดส่ง</span>
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="px-5 pb-6 flex gap-3">
          <Link href="/menu" className="flex-1">
            <div
              className="flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all"
              style={{
                background: shopOpen ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
                color: shopOpen ? G.primaryDk : "rgba(255,255,255,0.6)",
              }}
            >
              <ShoppingBag className="w-4 h-4" />
              {shopOpen ? "สั่งอาหารเลย" : "ดูเมนู"}
            </div>
          </Link>
          <Link href="/orders" className="flex-shrink-0">
            <div
              className="flex items-center justify-center gap-2 h-12 px-5 rounded-2xl font-bold text-sm active:scale-[0.98] transition-all"
              style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1.5px solid rgba(255,255,255,0.35)" }}
            >
              <Clock className="w-4 h-4" />
              ออเดอร์
            </div>
          </Link>
        </div>
      </div>

      {/* ── Closed Banner (prominent) ── */}
      {!shopOpen && (
        <div className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{ boxShadow: "0 2px 12px rgba(239,68,68,0.15)" }}>
          <div className="bg-red-500 px-4 py-3 flex items-center gap-2">
            <span className="text-lg">🔴</span>
            <p className="font-bold text-white text-sm">ร้านปิดให้บริการชั่วคราว</p>
          </div>
          <div className="bg-red-50 border border-red-200 border-t-0 rounded-b-2xl px-4 py-3">
            <p className="text-sm text-red-700 font-medium">
              {data?.shopSetting.closedMessage || "ขออภัยในความไม่สะดวก กรุณากลับมาใหม่ในภายหลัง"}
            </p>
            <p className="text-xs text-red-400 mt-1">
              เปิดบริการ {data?.shopSetting.openTime ?? "08:00"} – {data?.shopSetting.closeTime ?? "22:00"} น.
            </p>
          </div>
        </div>
      )}

      {/* ── Cart float bar (when items in cart) ── */}
      {count > 0 && (
        <div className="mx-4 -mt-3 mb-1 relative z-10">
          <Link href="/cart">
            <div
              className="flex items-center justify-between px-4 py-3 rounded-2xl shadow-lg active:scale-[0.99] transition-all"
              style={{ background: G.grad, boxShadow: G.shadow }}
            >
              <div className="flex items-center gap-2 text-white text-sm font-bold">
                <ShoppingBag className="w-4 h-4" />
                มี {count} รายการในตะกร้า
              </div>
              <span className="text-white/80 text-sm font-medium">ดูตะกร้า →</span>
            </div>
          </Link>
        </div>
      )}

      <div className="flex-1 space-y-6 pt-4">

        {/* ── Banners (admin banners OR auto-generated from featured products) ── */}
        {(() => {
          const adminBanners = data?.banners ?? [];
          const fallbackProducts = (data?.featuredProducts ?? []).slice(0, 4);
          const hasAdminBanners = adminBanners.length > 0;
          const totalSlides = hasAdminBanners ? adminBanners.length : fallbackProducts.length;
          if (totalSlides === 0) return null;
          return (
            <div className="px-4">
              <div className="relative rounded-3xl overflow-hidden bg-gray-100" style={{ aspectRatio: "2.4/1" }}>

                {/* Admin banner slides */}
                {hasAdminBanners && adminBanners.map((b, i) => (
                  <div key={b.id} className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: i === bannerIdx ? 1 : 0 }}>
                    <Image src={b.imageUrl} alt={b.title ?? "Banner"} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" />
                    {b.title && (
                      <div className="absolute bottom-0 inset-x-0 px-4 py-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }}>
                        <p className="text-white font-bold text-sm drop-shadow-sm">{b.title}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Auto-generated product slides (fallback) */}
                {!hasAdminBanners && fallbackProducts.map((p, i) => (
                  <div key={p.id} className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: i === bannerIdx ? 1 : 0 }}>
                    {p.image ? (
                      <Image src={p.image} alt={p.name} fill className="object-cover" sizes="(max-width: 512px) 100vw, 512px" />
                    ) : (
                      <div className="w-full h-full" style={{ background: G.grad }} />
                    )}
                    {/* Overlay */}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 60%, transparent 100%)" }} />
                    <div className="absolute inset-0 flex flex-col justify-center px-5">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-1">
                        {p.category?.name}
                      </span>
                      <p className="text-white font-black text-lg leading-snug drop-shadow-sm line-clamp-2 max-w-[65%]">
                        {p.name}
                      </p>
                      <p className="text-white/90 font-bold text-base mt-1 drop-shadow-sm">
                        {formatPrice(p.price)}
                      </p>
                      <Link href="/menu">
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                          style={{ background: "rgba(255,255,255,0.92)", color: G.primaryDk }}>
                          <ShoppingBag className="w-3 h-3" />
                          สั่งเลย
                        </div>
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Dots + arrows — all at bottom right, no overlap with text */}
                {totalSlides > 1 && (
                  <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
                    <button
                      onClick={() => setBannerIdx((i) => (i - 1 + totalSlides) % totalSlides)}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.70)" }}>
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <button key={i} onClick={() => setBannerIdx(i)}
                        className="rounded-full transition-all"
                        style={{ width: i === bannerIdx ? 16 : 5, height: 5, background: i === bannerIdx ? "white" : "rgba(255,255,255,0.5)" }} />
                    ))}
                    <button
                      onClick={() => setBannerIdx((i) => (i + 1) % totalSlides)}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.70)" }}>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Flash Deals ── */}
        {(data?.flashDeals?.length ?? 0) > 0 && (
          <Section
            icon={<Zap className="w-4 h-4" style={{ color: "oklch(0.78 0.22 55)" }} />}
            title="Flash Sale"
            titleColor="oklch(0.55 0.22 40)"
            bgTitle="oklch(0.98 0.04 55)"
            href="/menu"
          >
            <div className="flex gap-3 overflow-x-auto px-4 pb-1 pt-1" style={{ scrollbarWidth: "none" }}>
              {data!.flashDeals.map((p) => (
                <FlashDealCard key={p.id} product={p} onAdd={() => shopOpen && handleQuickAdd(p)} shopClosed={!shopOpen} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Promotions ── show only when active coupons exist */}
        {(data?.activePromos?.length ?? 0) > 0 && (
          <Section
            icon={<Tag className="w-4 h-4" style={{ color: G.primary }} />}
            title="โปรโมชั่น & คูปอง"
            href="/menu"
          >
            <div className="flex flex-col gap-2 px-4">
              {data!.activePromos.map((p) => (
                <PromoCard key={p.id} promo={p} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Featured / Recommended ── */}
        {(data?.featuredProducts?.length ?? 0) > 0 && (
          <Section
            icon={<Star className="w-4 h-4" style={{ color: "oklch(0.75 0.20 85)" }} />}
            title="เมนูแนะนำ"
            href="/menu"
          >
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
              {data!.featuredProducts.map((p) => (
                <MenuCard key={p.id} product={p} onAdd={() => shopOpen && handleQuickAdd(p)} shopClosed={!shopOpen} isFavorited={favoriteIds.has(p.id)} onFavorite={isLoggedIn ? () => toggleFavorite(p.id) : undefined} />
              ))}
            </div>
          </Section>
        )}

        {/* ── Best Sellers ── */}
        {(data?.bestSellers?.length ?? 0) > 0 && (
          <Section
            icon={<Trophy className="w-4 h-4" style={{ color: G.primary }} />}
            title="ขายดีที่สุด"
            href="/menu"
          >
            <div className="px-4 space-y-2">
              {data!.bestSellers.slice(0, 5).map((p, i) => (
                <BestSellerRow key={p.id} product={p} rank={i + 1} onAdd={() => shopOpen && handleQuickAdd(p)} shopClosed={!shopOpen} />
              ))}
            </div>
          </Section>
        )}

        {/* ── CTA Banner ── */}
        <div className="px-4 pb-4">
          <Link href="/menu">
            <div
              className="relative overflow-hidden rounded-3xl p-6 flex items-center justify-between active:scale-[0.98] transition-all"
              style={{ background: G.grad, boxShadow: G.shadow }}
            >
              {/* Deco */}
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-10" style={{ background: "white" }} />
              <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full opacity-10" style={{ background: "white" }} />

              <div className="relative">
                <p className="text-white font-extrabold text-lg leading-tight">ดูเมนูทั้งหมด</p>
                <p className="text-white/70 text-sm mt-0.5">กว่า 50 รายการ รอคุณอยู่</p>
              </div>
              <div className="relative w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-7 h-7 text-white" />
              </div>
            </div>
          </Link>
        </div>

      </div>
    </div>

    {/* Product detail sheet */}
    <ProductDetailSheet
      product={detailProduct}
      open={!!detailProduct}
      onClose={() => setDetailProduct(null)}
    />
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Section({ icon, title, titleColor, bgTitle, href, children }: {
  icon: React.ReactNode; title: string; titleColor?: string;
  bgTitle?: string; href: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: bgTitle ?? G.primaryLt }}>
            {icon}
          </div>
          <h2 className="font-extrabold text-[15px]" style={{ color: titleColor ?? G.fg }}>
            {title}
          </h2>
        </div>
        <Link href={href}>
          <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: G.primary }}>
            ดูทั้งหมด <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
      {children}
    </div>
  );
}

// Flash Deal card with countdown
function FlashDealCard({ product, onAdd, shopClosed }: {
  product: ProductWithCategory & { salePrice: number; saleEndsAt: string | null };
  onAdd: () => void; shopClosed: boolean;
}) {
  const countdown = useCountdown(product.saleEndsAt);
  const discount = Math.round((1 - product.salePrice / product.price) * 100);

  return (
    <Link href="/menu">
      <div className="flex-shrink-0 w-40 rounded-2xl overflow-hidden bg-card cursor-pointer active:scale-[0.97] transition-all"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
        <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="160px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50"><UtensilsCrossed className="w-8 h-8 text-gray-300" /></div>
          )}
          {/* Discount badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white"
            style={{ background: "oklch(0.58 0.22 25)" }}>
            -{discount}%
          </div>
        </div>
        <div className="p-2.5 space-y-1">
          <p className="font-bold text-xs line-clamp-2 leading-snug" style={{ color: G.fg }}>{product.name}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-sm" style={{ color: "oklch(0.52 0.22 25)" }}>
              {formatPrice(product.salePrice)}
            </span>
            <span className="text-[10px] line-through" style={{ color: G.fgMuted }}>
              {formatPrice(product.price)}
            </span>
          </div>
          {countdown && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full w-fit"
              style={{ background: "oklch(0.97 0.04 25)" }}>
              <Clock className="w-2.5 h-2.5" style={{ color: "oklch(0.52 0.22 25)" }} />
              <span className="text-[10px] font-bold tabular-nums" style={{ color: "oklch(0.52 0.22 25)" }}>
                {countdown}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Horizontal menu card
function MenuCard({ product, onAdd, shopClosed, isFavorited, onFavorite }: {
  product: ProductWithCategory; onAdd: () => void; shopClosed: boolean;
  isFavorited?: boolean; onFavorite?: () => void;
}) {
  return (
    <Link href="/menu">
      <div className="flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-card active:scale-[0.97] transition-all"
        style={{ boxShadow: "0 2px 10px oklch(0.55 0.18 145 / 0.10)" }}>
        <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
          {product.image ? (
            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="144px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: G.primaryLt }}><UtensilsCrossed className="w-8 h-8" style={{ color: G.primary, opacity: 0.4 }} /></div>
          )}
          <span className="absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white"
            style={{ background: G.primary }}>
            {product.category.name}
          </span>
          {onFavorite && (
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onFavorite(); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-all"
              style={{
                background: isFavorited ? "oklch(0.62 0.22 15)" : "rgba(255,255,255,0.85)",
                backdropFilter: "blur(6px)",
                boxShadow: isFavorited ? "0 2px 8px oklch(0.55 0.22 15 / 0.40)" : "0 1px 4px rgba(0,0,0,0.12)",
              }}
            >
              <Heart className="w-3.5 h-3.5" fill={isFavorited ? "white" : "none"} stroke={isFavorited ? "none" : "oklch(0.62 0.22 15)"} strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="p-2.5">
          <p className="font-bold text-xs line-clamp-2 leading-snug" style={{ color: G.fg }}>{product.name}</p>
          <p className="font-extrabold text-sm mt-1" style={{ color: G.primary }}>{formatPrice(product.price)}</p>
        </div>
      </div>
    </Link>
  );
}

// Best seller row item
function BestSellerRow({ product, rank, onAdd, shopClosed }: {
  product: ProductWithCategory & { totalSold: number };
  rank: number; onAdd: () => void; shopClosed: boolean;
}) {
  const rankColors = [
    { bg: "oklch(0.95 0.12 85)", color: "oklch(0.65 0.22 75)" },
    { bg: "oklch(0.93 0.05 0)", color: "oklch(0.60 0.05 0)" },
    { bg: "oklch(0.95 0.08 50)", color: "oklch(0.62 0.18 45)" },
  ];
  const rc = rankColors[rank - 1] ?? { bg: "oklch(0.94 0.02 145)", color: G.fgMuted };

  return (
    <div className="flex items-center gap-3 bg-card rounded-2xl p-3"
      style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      {/* Rank badge */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0"
        style={{ background: rc.bg, color: rc.color }}>
        {rank <= 3
          ? <Trophy className="w-4 h-4" style={{ color: rc.color }} />
          : <span className="text-xs font-bold">{rank}</span>
        }
      </div>

      {/* Product image */}
      <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="48px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: G.primaryLt }}><UtensilsCrossed className="w-5 h-5" style={{ color: G.primary, opacity: 0.4 }} /></div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm line-clamp-1" style={{ color: G.fg }}>{product.name}</p>
        <div className="mt-0.5">
          <span className="font-extrabold text-sm" style={{ color: G.primary }}>{formatPrice(product.price)}</span>
        </div>
      </div>

      {/* Add button */}
      <button
        disabled={shopClosed}
        onClick={shopClosed ? undefined : onAdd}
        className="flex-shrink-0 active:scale-90 transition-transform disabled:opacity-50"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: shopClosed ? "oklch(0.93 0.01 0)" : G.grad,
            boxShadow: shopClosed ? "none" : "0 3px 8px oklch(0.60 0.20 148 / 0.28)",
          }}
        >
          <span className="text-white font-bold text-lg">{shopClosed ? "—" : "+"}</span>
        </div>
      </button>
    </div>
  );
}

// Promo card — coupon style
function PromoCard({ promo }: {
  promo: { id: string; code: string; type: string; value: number; minOrderAmount: number; expiresAt: string | null; name: string };
}) {
  const [copied, setCopied] = useState(false);
  const isPercent = promo.type === "PERCENT";
  const bigLabel = isPercent ? `${promo.value}%` : `฿${promo.value}`;

  const daysLeft = promo.expiresAt
    ? Math.ceil((new Date(promo.expiresAt).getTime() - Date.now()) / 86400000)
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(promo.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-2xl overflow-hidden flex shadow-sm" style={{ border: "1.5px solid " + G.border }}>
      {/* Left — value */}
      <div className="flex flex-col items-center justify-center px-3 py-3 flex-shrink-0"
        style={{ background: G.grad, minWidth: 64 }}>
        <span className="text-white font-black text-xl leading-none">{bigLabel}</span>
        <span className="text-white/80 text-[9px] font-semibold mt-0.5">ส่วนลด</span>
      </div>

      {/* Divider notch */}
      <div className="relative flex-shrink-0 w-0">
        <div className="absolute -top-2 left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-background" />
        <div className="absolute -bottom-2 left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-background" />
        <div className="h-full border-l-2 border-dashed" style={{ borderColor: G.border }} />
      </div>

      {/* Right — details */}
      <div className="flex-1 px-3 py-2.5 flex flex-col justify-between gap-1 min-w-0 bg-white">
        <p className="text-xs font-semibold text-gray-700 truncate">{promo.name}</p>

        <button
          onClick={handleCopy}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg active:scale-[0.97] transition-all"
          style={{ background: G.primaryXlt }}
        >
          <span className="font-black text-sm tracking-widest" style={{ color: G.primaryDk }}>
            {promo.code}
          </span>
          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: G.primary }}>
            {copied ? <><Check className="w-3 h-3" />คัดลอก</> : <><Copy className="w-3 h-3" />คัดลอก</>}
          </span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {promo.minOrderAmount > 0 && (
            <span className="text-[10px] text-gray-400">ขั้นต่ำ {formatPrice(promo.minOrderAmount)}</span>
          )}
          {daysLeft !== null && (
            <span className="text-[10px]" style={{ color: daysLeft <= 3 ? "oklch(0.58 0.22 25)" : G.fgMuted }}>
              {daysLeft <= 0 ? "หมดอายุแล้ว" : `เหลือ ${daysLeft} วัน`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

