import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const subtotal = parseFloat(searchParams.get("subtotal") || "0");

  if (!code) return error("กรุณากรอกโค้ดส่วนลด");

  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase(),
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!coupon) return error("โค้ดส่วนลดไม่ถูกต้องหรือหมดอายุแล้ว");
  if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
    return error(`ต้องสั่งขั้นต่ำ ${coupon.minOrderAmount} บาท เพื่อใช้โค้ดนี้`);
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return error("โค้ดนี้ถูกใช้งานครบแล้ว");
  }

  const userUsed = await prisma.couponUsage.count({
    where: { couponId: coupon.id, userId: session.userId },
  });
  if (userUsed >= coupon.maxUsesPerUser) {
    return error("คุณใช้โค้ดนี้ครบตามจำนวนที่กำหนดแล้ว");
  }

  const discountAmount = coupon.type === "PERCENT"
    ? Math.floor(subtotal * coupon.value / 100)
    : Math.min(coupon.value, subtotal);

  return ok({ coupon: { id: coupon.id, name: coupon.name, type: coupon.type, value: coupon.value }, discountAmount });
}
