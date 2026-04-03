import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const schema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  deliveryFee: z.number().min(0).optional(),
  minOrder: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const zone = await prisma.deliveryZone.update({ where: { id }, data });
    return ok(zone);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  await prisma.deliveryZone.update({ where: { id }, data: { isActive: false } });
  return ok({ message: "ปิดโซนจัดส่งแล้ว" });
}
