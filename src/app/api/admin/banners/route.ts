import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url(),
  linkUrl: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const banners = await prisma.banner.findMany({ orderBy: { sortOrder: "asc" } });
  return ok(banners);
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const banner = await prisma.banner.create({ data });
    return created(banner);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
