import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { startOfDay, startOfMonth, startOfWeek, subDays, format } from "date-fns";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return unauthorized();
  }

  const now = new Date();
  const todayStart    = startOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const monthStart    = startOfMonth(now);
  const weekStart     = startOfWeek(now, { weekStartsOn: 1 });

  const [
    todayOrders, yesterdayOrders, monthOrders, totalCustomers, pendingOrders,
    todayRevenue, yesterdayRevenue, monthRevenue, topProducts, recentOrders, dailyRevenue,
  ] = await Promise.all([
    prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: yesterdayStart, lt: todayStart } } }),
    prisma.order.count({ where: { status: { not: "CANCELLED" }, createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "PENDING_PAYMENT"] } } }),
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: todayStart } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: yesterdayStart, lt: todayStart } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: monthStart } }, _sum: { total: true } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
      include: { user: { select: { name: true, phone: true } }, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const day = subDays(now, 6 - i);
        const start = startOfDay(day);
        const end = new Date(start.getTime() + 86400000);
        return prisma.order.aggregate({
          where: { status: { not: "CANCELLED" }, createdAt: { gte: start, lt: end } },
          _sum: { total: true },
        }).then((r) => ({ date: format(day, "dd/MM"), revenue: r._sum.total ?? 0 }));
      })
    ),
  ]);

  const productIds = topProducts.map((p) => p.productId);
  const productDetails = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, image: true } });

  const topProductsWithDetails = topProducts.map((tp) => ({
    ...tp,
    product: productDetails.find((p) => p.id === tp.productId),
  }));

  const todayRevenueVal     = todayRevenue._sum.total ?? 0;
  const yesterdayRevenueVal = yesterdayRevenue._sum.total ?? 0;
  const avgOrderValue = todayOrders > 0 ? Math.round(todayRevenueVal / todayOrders) : 0;

  return ok({
    metrics: {
      todayOrders,
      yesterdayOrders,
      monthOrders,
      totalCustomers,
      pendingOrders,
      todayRevenue:     todayRevenueVal,
      yesterdayRevenue: yesterdayRevenueVal,
      monthRevenue:     monthRevenue._sum.total ?? 0,
      avgOrderValue,
    },
    topProducts: topProductsWithDetails,
    recentOrders,
    dailyRevenue,
  });
}
