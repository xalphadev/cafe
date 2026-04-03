import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const schema = z.object({
  name: z.string().optional(),
  type: z.enum(["PERCENT", "FIXED"]).optional(),
  value: z.number().optional(),
  minOrderAmount: z.number().optional(),
  maxUses: z.number().nullable().optional(),
  maxUsesPerUser: z.number().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : data.expiresAt },
    });
    return ok(coupon);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  await prisma.coupon.update({ where: { id }, data: { isActive: false } });
  return ok({ message: "ปิดการใช้งานคูปองแล้ว" });
}
