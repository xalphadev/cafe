import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  deliveryFee: z.number().min(0),
  minOrder: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const zones = await prisma.deliveryZone.findMany({ orderBy: { deliveryFee: "asc" } });
  return ok(zones);
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const zone = await prisma.deliveryZone.create({ data });
    return created(zone);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
