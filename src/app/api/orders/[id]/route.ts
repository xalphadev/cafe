import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized, notFound } from "@/lib/response";

const cancelSchema = z.object({ action: z.literal("cancel") });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.userId },
    include: {
      items: { include: { product: true } },
      address: true,
      payment: true,
      coupon: true,
      deliveryZone: true,
      rider: true,
      user: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!order) return notFound("ไม่พบออเดอร์");
  return ok(order);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;

  const order = await prisma.order.findFirst({ where: { id, userId: session.userId } });
  if (!order) return notFound("ไม่พบออเดอร์");

  try {
    const body = await request.json();
    const { action } = cancelSchema.parse(body);

    if (action === "cancel") {
      if (!["PENDING_PAYMENT", "PENDING"].includes(order.status)) {
        return error("ไม่สามารถยกเลิกออเดอร์ในสถานะนี้ได้");
      }
      const updated = await prisma.order.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return ok(updated);
    }
    return error("action ไม่ถูกต้อง");
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
