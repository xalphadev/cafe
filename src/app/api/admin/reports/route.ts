import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { startOfDay, subDays, format, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";
  const exportCsv = searchParams.get("export") === "csv";

  let days = 7;
  if (period === "30d") days = 30;
  if (period === "90d") days = 90;

  const now = new Date();
  const dailyData = await Promise.all(
    Array.from({ length: days }, (_, i) => {
      const day = subDays(now, days - 1 - i);
      const start = startOfDay(day);
      const end = new Date(start.getTime() + 86400000);
      return Promise.all([
        prisma.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: start, lt: end } }, _sum: { total: true }, _count: true }),
        prisma.order.count({ where: { status: "CANCELLED", createdAt: { gte: start, lt: end } } }),
      ]).then(([agg, cancelled]) => ({
        date: format(day, "dd/MM/yyyy"),
        revenue: agg._sum.total ?? 0,
        orders: agg._count,
        cancelled,
      }));
    })
  );

  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: subDays(now, days) } } },
    _sum: { quantity: true, unitPrice: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 10,
  });

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } });

  const topProductsWithNames = topProducts.map((tp) => ({
    ...tp,
    product: products.find((p) => p.id === tp.productId),
    revenue: (tp._sum.unitPrice ?? 0) * (tp._sum.quantity ?? 0),
  }));

  if (exportCsv) {
    const csv = [
      "วันที่,รายได้,จำนวนออเดอร์,ยกเลิก",
      ...dailyData.map((d) => `${d.date},${d.revenue},${d.orders},${d.cancelled}`),
    ].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="report-${period}-${format(now, "yyyyMMdd")}.csv"`,
      },
    });
  }

  const totals = dailyData.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, orders: acc.orders + d.orders }),
    { revenue: 0, orders: 0 }
  );

  return ok({ dailyData, topProducts: topProductsWithNames, totals, period });
}
