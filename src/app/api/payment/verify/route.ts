import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await request.json();
  const { orderId, slipUrl } = body;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.userId },
    include: { payment: true },
  });

  if (!order) return error("ไม่พบออเดอร์");
  if (order.paymentStatus === "PAID") return ok({ verified: true, status: order.status });

  // If slip URL provided, save it to payment record
  if (slipUrl && order.payment) {
    await prisma.payment.update({
      where: { orderId },
      data: { slipUrl },
    });
  }

  return ok({ verified: false, status: order.status, slipUploaded: !!slipUrl });
}

// Admin confirms payment manually (for now)
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return unauthorized();

  const { orderId } = await request.json();

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: "PAID", status: "PENDING" },
    });

    await tx.payment.update({
      where: { orderId },
      data: { verifiedAt: new Date() },
    });

    // Award points
    const loyalty = await tx.loyaltySetting.findUnique({ where: { id: "default" } });
    if (loyalty && updated.pointsEarned > 0) {
      const user = await tx.user.update({
        where: { id: updated.userId },
        data: { pointsBalance: { increment: updated.pointsEarned } },
      });
      await tx.pointTransaction.create({
        data: {
          userId: updated.userId,
          orderId,
          type: "EARN",
          amount: updated.pointsEarned,
          balanceAfter: user.pointsBalance,
          note: `ซื้อออเดอร์ #${orderId.slice(-8)}`,
        },
      });
    }

    return updated;
  });

  return ok(order);
}
