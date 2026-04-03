import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const schema = z.object({
  earnRate: z.number().min(1),
  redeemRate: z.number().min(1),
  minRedeemPoints: z.number().int().min(0),
  maxRedeemPercent: z.number().min(0).max(100),
});

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const setting = await prisma.loyaltySetting.findUnique({ where: { id: "default" } });
  return ok(setting);
}

export async function PUT(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const setting = await prisma.loyaltySetting.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    return ok(setting);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

// Manual points adjustment
export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { userId, amount, note } = await request.json();
  if (!userId || !amount) return error("ข้อมูลไม่ครบ");

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { pointsBalance: { increment: amount } },
    });
    await tx.pointTransaction.create({
      data: {
        userId,
        type: amount > 0 ? "MANUAL_ADD" : "MANUAL_DEDUCT",
        amount,
        balanceAfter: updated.pointsBalance,
        note: note || (amount > 0 ? "เพิ่มแต้มโดย Admin" : "ลดแต้มโดย Admin"),
      },
    });
    return updated;
  });
  return ok({ pointsBalance: user.pointsBalance });
}
