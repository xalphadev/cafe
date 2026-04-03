import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized, notFound } from "@/lib/response";

const schema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  image: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  salePrice: z.number().min(0).nullable().optional(),
  saleEndsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const { saleEndsAt, ...rest } = schema.parse(body);
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...rest,
        ...(saleEndsAt !== undefined ? { saleEndsAt: saleEndsAt ? new Date(saleEndsAt) : null } : {}),
      },
    });
    return ok(product);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    await prisma.product.update({ where: { id }, data: { isAvailable: false } });
    return ok({ message: "ลบสินค้าแล้ว" });
  } catch {
    return notFound("ไม่พบสินค้า");
  }
}
