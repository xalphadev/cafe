import { NextRequest } from "next/server";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return error("ต้องระบุ orderId");

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.userId },
    include: { payment: true },
  });

  if (!order) return error("ไม่พบออเดอร์");
  if (order.status !== "PENDING_PAYMENT") return error("ออเดอร์นี้ไม่รอการชำระเงิน");

  // Check if shop has a custom QR image
  const shopSetting = await prisma.shopSetting.findFirst();
  if (shopSetting?.qrCodeUrl) {
    return ok({
      qrDataUrl: null,
      shopQrUrl: shopSetting.qrCodeUrl,
      amount: order.total,
      orderId: order.id,
      paymentId: order.payment?.id,
    });
  }

  const promptpayId = process.env.PROMPTPAY_ID || "0812345678";
  const payload = generatePayload(promptpayId, { amount: order.total });
  const qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 2 });

  return ok({ qrDataUrl, shopQrUrl: null, amount: order.total, orderId: order.id, paymentId: order.payment?.id });
}
