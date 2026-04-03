import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const VALID_STATUSES = ["PENDING_PAYMENT", "PENDING", "CONFIRMED", "PREPARING", "READY", "PICKED_UP", "DELIVERING", "COMPLETED", "CANCELLED"];
  const where = status && status !== "ALL" && VALID_STATUSES.includes(status) ? { status: status as never } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true, image: true } } } },
        address: true,
        deliveryZone: true,
        payment: true,
        rider: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return ok({ orders, total, page, limit, pages: Math.ceil(total / limit) });
}
