import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const schema = z.object({
  name: z.string().min(1).max(50).optional(),
  image: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const category = await prisma.category.update({ where: { id }, data });
    return ok(category);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  await prisma.category.update({ where: { id }, data: { isActive: false } });
  return ok({ message: "ลบหมวดหมู่แล้ว" });
}
