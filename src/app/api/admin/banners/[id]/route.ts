import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized, notFound } from "@/lib/response";

const schema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url().optional(),
  linkUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) return notFound("ไม่พบแบนเนอร์");
    const updated = await prisma.banner.update({ where: { id }, data });
    return ok(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return notFound("ไม่พบแบนเนอร์");
  await prisma.banner.delete({ where: { id } });
  return ok({ message: "ลบแบนเนอร์แล้ว" });
}
