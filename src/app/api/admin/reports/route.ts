import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { startOfDay, subDays, format } from "date-fns";

export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";
  const exportCsv = searchParams.get("export") === "csv";
  const fromParam = searchParams.get("from");
  const toParam   = searchParams.get("to");

  const now = new Date();
  let startDate: Date;
  let days: number;

  if (fromParam && toParam) {
    startDate = startOfDay(new Date(fromParam));
    const endDay = startOfDay(new Date(toParam));
    days = Math.max(1, Math.round((endDay.getTime() - startDate.getTime()) / 86400000) + 1);
  } else {
    days = period === "1d" ? 1 : period === "30d" ? 30 : period === "90d" ? 90 : 7;
    startDate = startOfDay(subDays(now, days - 1));
  }

  const prevStartDate = startOfDay(subDays(startDate, days));

  // ── Daily data ────────────────────────────────────────────────────
  const dailyData = await Promise.all(
    Array.from({ length: days }, (_, i) => {
      const day = new Date(startDate.getTime() + i * 86400000);
      const start = startOfDay(day);
      const end = new Date(start.getTime() + 86400000);
      return Promise.all([
        prisma.order.aggregate({
          where: { status: { not: "CANCELLED" }, createdAt: { gte: start, lt: end } },
          _sum: { total: true }, _count: true,
        }),
        prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: start, lt: end } } }),
      ]).then(([agg, cancelled]) => ({
        date: format(day, days <= 7 ? "EEE dd/MM" : "dd/MM"),
        revenue: agg._sum.total ?? 0,
        orders: agg._count,
        cancelled,
      }));
    })
  );

  // ── Totals (current + previous period) ───────────────────────────
  const [currentAgg, prevAgg, cancelledCount, prevCancelledCount, itemsAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: startDate } },
      _sum: { total: true }, _count: true,
    }),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: prevStartDate, lt: startDate } },
      _sum: { total: true }, _count: true,
    }),
    prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: startDate } } }),
    prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: prevStartDate, lt: startDate } } }),
    prisma.orderItem.aggregate({
      where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: startDate } } },
      _sum: { quantity: true },
    }),
  ]);

  const revenue = currentAgg._sum.total ?? 0;
  const orders = currentAgg._count;
  const prevRevenue = prevAgg._sum.total ?? 0;
  const prevOrders = prevAgg._count;
  const itemsSold = itemsAgg._sum.quantity ?? 0;
  const avgOrderValue = orders > 0 ? revenue / orders : 0;
  const prevAvgOrderValue = prevOrders > 0 ? prevRevenue / prevOrders : 0;
  const totalWithCancelled = orders + cancelledCount;
  const cancellationRate = totalWithCancelled > 0 ? (cancelledCount / totalWithCancelled) * 100 : 0;

  const pct = (cur: number, prev: number) =>
    prev === 0 ? null : Math.round(((cur - prev) / prev) * 100);

  // ── Top products ──────────────────────────────────────────────────
  const topProductsRaw = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: startDate } } },
    _sum: { quantity: true, unitPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });
  const productIds = topProductsRaw.map(p => p.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, image: true, category: { select: { name: true } } },
  });
  const topProducts = topProductsRaw.map(tp => ({
    productId: tp.productId,
    qty: tp._sum.quantity ?? 0,
    revenue: (tp._sum.unitPrice ?? 0) * (tp._sum.quantity ?? 1),
    product: products.find(p => p.id === tp.productId),
  }));

  // ── Category breakdown ────────────────────────────────────────────
  const categoryItemsRaw = await prisma.orderItem.findMany({
    where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: startDate } } },
    select: {
      quantity: true, unitPrice: true,
      product: { select: { category: { select: { id: true, name: true } } } },
    },
  });
  const categoryMap: Record<string, { name: string; revenue: number; qty: number }> = {};
  for (const item of categoryItemsRaw) {
    const cat = item.product.category;
    if (!categoryMap[cat.id]) categoryMap[cat.id] = { name: cat.name, revenue: 0, qty: 0 };
    categoryMap[cat.id].revenue += item.unitPrice * item.quantity;
    categoryMap[cat.id].qty += item.quantity;
  }
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Hourly distribution ───────────────────────────────────────────
  const hourlyOrders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, createdAt: { gte: startDate } },
    select: { createdAt: true, total: true },
  });
  const hourlyMap: Record<number, { orders: number; revenue: number }> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = { orders: 0, revenue: 0 };
  for (const o of hourlyOrders) {
    const h = new Date(o.createdAt).getHours();
    hourlyMap[h].orders += 1;
    hourlyMap[h].revenue += o.total;
  }
  const hourlyData = Object.entries(hourlyMap).map(([h, v]) => ({
    hour: `${h.padStart(2, "0")}:00`,
    ...v,
  }));

  // ── Payment methods ───────────────────────────────────────────────
  const paymentRaw = await prisma.order.groupBy({
    by: ["paymentMethod"],
    where: { status: { not: "CANCELLED" }, createdAt: { gte: startDate } },
    _count: true, _sum: { total: true },
  });
  const paymentBreakdown = paymentRaw.map(p => ({
    method: p.paymentMethod,
    count: p._count,
    revenue: p._sum.total ?? 0,
  }));

  // ── Unique customers ──────────────────────────────────────────────
  const [uniqueCustomers, newCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: startDate } },
      select: { userId: true }, distinct: ["userId"],
    }),
    prisma.user.count({ where: { createdAt: { gte: startDate } } }),
  ]);

  if (exportCsv) {
    const csv = [
      "วันที่,รายได้,จำนวนออเดอร์,ยกเลิก",
      ...dailyData.map(d => `${d.date},${d.revenue},${d.orders},${d.cancelled}`),
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${period}-${format(now, "yyyyMMdd")}.csv"`,
      },
    });
  }

  return ok({
    period,
    totals: {
      revenue, orders, prevRevenue, prevOrders,
      revenuePct: pct(revenue, prevRevenue),
      ordersPct: pct(orders, prevOrders),
      avgOrderValue, prevAvgOrderValue,
      avgPct: pct(avgOrderValue, prevAvgOrderValue),
      itemsSold, cancelledCount, cancellationRate,
    },
    dailyData,
    topProducts,
    categoryBreakdown,
    hourlyData,
    paymentBreakdown,
    customerStats: {
      uniqueCustomers: uniqueCustomers.length,
      newCustomers,
    },
  });
}
