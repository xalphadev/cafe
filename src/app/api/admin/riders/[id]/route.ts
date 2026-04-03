import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized, notFound } from "@/lib/response";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(9).optional(),
  vehiclePlate: z.string().optional(),
  isActive: z.boolean().optional(),
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const data = updateSchema.parse(body);
    const rider = await prisma.rider.findUnique({ where: { id } });
    if (!rider) return notFound("ไม่พบไรเดอร์");
    const updated = await prisma.rider.update({ where: { id }, data });
    return ok(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  const rider = await prisma.rider.findUnique({ where: { id } });
  if (!rider) return notFound("ไม่พบไรเดอร์");
  await prisma.rider.delete({ where: { id } });
  return ok({ message: "ลบไรเดอร์แล้ว" });
}
