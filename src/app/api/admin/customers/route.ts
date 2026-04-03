import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const tag = searchParams.get("tag");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { status: { not: "CANCELLED" } },
        select: { total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.user.count({ where: { role: "CUSTOMER" } });

  const customersWithStats = await Promise.all(
    customers.map(async (c) => {
      const spent = await prisma.order.aggregate({
        where: { userId: c.id, status: { not: "CANCELLED" } },
        _sum: { total: true },
      });
      const totalSpent = spent._sum.total ?? 0;
      const lastOrderDate = c.orders[0]?.createdAt ?? null;
      const daysSinceLastOrder = lastOrderDate
        ? Math.floor((Date.now() - lastOrderDate.getTime()) / 86400000)
        : null;

      let customerTag = "ใหม่";
      if (c._count.orders >= 10 || totalSpent >= 3000) customerTag = "VIP";
      else if (c._count.orders >= 3) customerTag = "ประจำ";
      else if (daysSinceLastOrder !== null && daysSinceLastOrder > 30) customerTag = "inactive";

      if (tag && tag !== "ALL" && customerTag !== tag) return null;

      return { ...c, totalSpent, customerTag, lastOrderDate };
    })
  );

  return ok({
    customers: customersWithStats.filter(Boolean),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
