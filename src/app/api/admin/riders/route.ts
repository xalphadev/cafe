import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(9),
  vehiclePlate: z.string().optional(),
});

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const riders = await prisma.rider.findMany({ orderBy: { createdAt: "desc" } });
  return ok(riders);
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const rider = await prisma.rider.create({ data });
    return created(rider);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
