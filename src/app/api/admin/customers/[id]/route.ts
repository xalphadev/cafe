import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized, notFound } from "@/lib/response";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      },
      pointsTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) return notFound();

  // Total spent
  const spent = await prisma.order.aggregate({
    where: { userId: id, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  const totalSpent = spent._sum.total ?? 0;

  // Avg order value
  const avgOrder = user._count.orders > 0 ? totalSpent / user._count.orders : 0;

  // Favorite products (most ordered)
  const itemAgg = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { userId: id, status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const favoriteProducts = await Promise.all(
    itemAgg.map(async (a) => {
      const product = await prisma.product.findUnique({
        where: { id: a.productId },
        select: { id: true, name: true, image: true },
      });
      return { ...product, totalOrdered: a._sum.quantity ?? 0 };
    })
  );

  // Tag
  const lastOrderDate = user.orders[0]?.createdAt ?? null;
  const daysSince = lastOrderDate ? Math.floor((Date.now() - lastOrderDate.getTime()) / 86400000) : null;
  let customerTag = "ใหม่";
  if (user._count.orders >= 10 || totalSpent >= 3000) customerTag = "VIP";
  else if (user._count.orders >= 3) customerTag = "ประจำ";
  else if (daysSince !== null && daysSince > 30) customerTag = "inactive";

  return ok({
    ...user,
    totalSpent,
    avgOrder,
    customerTag,
    lastOrderDate,
    favoriteProducts,
  });
}
