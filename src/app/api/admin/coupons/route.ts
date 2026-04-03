import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  name: z.string().min(1),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional().default(0),
  maxUses: z.number().int().optional().nullable(),
  maxUsesPerUser: z.number().int().min(1).optional().default(1),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { usages: true } } },
  });
  return ok(coupons);
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const coupon = await prisma.coupon.create({
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null },
    });
    return created(coupon);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
