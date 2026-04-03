import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const now = new Date();

  const [banners, shopSetting, featuredProducts, bestSellers, activePromos, flashDeals] = await Promise.all([
    // Active banners
    prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 5,
    }),

    // Shop status
    prisma.shopSetting.findFirst(),

    // Featured products
    prisma.product.findMany({
      where: { isFeatured: true, isAvailable: true },
      include: {
        category: true,
        optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),

    // Best sellers — aggregate order items
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }).then(async (grouped) => {
      const ids = grouped.map((g) => g.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, isAvailable: true },
        include: {
          category: true,
          optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
        },
      });
      // Sort by best-seller rank
      return ids
        .map((id) => {
          const product = products.find((p) => p.id === id);
          const stats = grouped.find((g) => g.productId === id);
          return product ? { ...product, totalSold: stats?._sum.quantity ?? 0 } : null;
        })
        .filter(Boolean);
    }),

    // Active coupons (public-facing — not showing private ones)
    prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: {
        id: true, code: true, type: true, value: true,
        minOrderAmount: true, expiresAt: true, name: true,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),

    // Flash deals — products with active sale price
    prisma.product.findMany({
      where: {
        isAvailable: true,
        salePrice: { not: null },
        OR: [{ saleEndsAt: null }, { saleEndsAt: { gt: now } }],
      },
      include: {
        category: true,
        optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
      },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
  ]);

  return ok({
    banners,
    shopSetting: shopSetting ?? { isOpen: true, openTime: "08:00", closeTime: "22:00", closedMessage: "" },
    featuredProducts,
    bestSellers,
    activePromos,
    flashDeals,
  });
}
