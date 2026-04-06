import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized, notFound } from "@/lib/response";

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "PICKED_UP", "DELIVERING", "COMPLETED", "CANCELLED"]).optional(),
  riderId: z.string().nullable().optional(),
  estimatedDeliveryAt: z.string().nullable().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { id } = await params;
  try {
    const body = await request.json();
    const { status, riderId, estimatedDeliveryAt } = updateSchema.parse(body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return notFound("ไม่พบออเดอร์");

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (riderId !== undefined) updateData.riderId = riderId;
    if (estimatedDeliveryAt !== undefined) {
      updateData.estimatedDeliveryAt = estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({ where: { id }, data: updateData });

      if (status === "COMPLETED" && order.pointsEarned > 0 && order.paymentStatus === "PAID") {
        const existing = await tx.pointTransaction.findFirst({ where: { orderId: id, type: "EARN" } });
        if (!existing) {
          const user = await tx.user.update({
            where: { id: order.userId },
            data: { pointsBalance: { increment: order.pointsEarned } },
          });
          await tx.pointTransaction.create({
            data: {
              userId: order.userId, orderId: id, type: "EARN",
              amount: order.pointsEarned, balanceAfter: user.pointsBalance,
              note: `ซื้อออเดอร์ #${id.slice(-8)}`,
            },
          });
        }
      }
      return updatedOrder;
    });

    return ok(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
