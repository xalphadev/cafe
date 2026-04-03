import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const schema = z.object({
  isOpen: z.boolean().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  closedDays: z.array(z.number().int().min(0).max(6)).optional(),
  closedMessage: z.string().optional(),
  qrCodeUrl: z.string().nullable().optional(),
});

async function getOrCreateSetting() {
  let setting = await prisma.shopSetting.findFirst();
  if (!setting) {
    setting = await prisma.shopSetting.create({
      data: { closedDays: [] },
    });
  }
  return setting;
}

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }
  return ok(await getOrCreateSetting());
}

export async function PATCH(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const setting = await getOrCreateSetting();
    const updated = await prisma.shopSetting.update({ where: { id: setting.id }, data });
    return ok(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
