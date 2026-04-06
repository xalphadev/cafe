import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";
import { sendWebPush } from "@/lib/web-push";

const createOrderSchema = z.object({
  orderType: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
  addressId: z.string().optional(),
  deliveryZoneId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    note: z.string().optional(),
  })),
  paymentMethod: z.enum(["QR_PROMPTPAY", "COD"]),
  couponCode: z.string().optional(),
  pointsToUse: z.number().int().min(0).optional().default(0),
  note: z.string().optional(),
}).refine((d) => d.orderType === "PICKUP" || (!!d.addressId && !!d.deliveryZoneId), {
  message: "กรุณาระบุที่อยู่และโซนจัดส่ง",
});

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const orders = await prisma.order.findMany({
    where: { userId: session.userId },
    include: {
      items: { include: { product: true } },
      address: true,
      payment: true,
      coupon: true,
      deliveryZone: true,
      rider: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(orders);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const data = createOrderSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return unauthorized();

    const allProducts = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) } },
      select: { id: true, name: true, isAvailable: true, price: true },
    });

    const unavailable = allProducts.filter(p => !p.isAvailable);
    if (unavailable.length > 0) {
      return NextResponse.json({
        success: false,
        error: "มีสินค้าบางรายการไม่พร้อมจำหน่าย",
        unavailableIds: unavailable.map(p => p.id),
        unavailableNames: unavailable.map(p => p.name),
      }, { status: 400 });
    }

    const products = allProducts;

    const isPickup = data.orderType === "PICKUP";

    let zone = null;
    if (!isPickup) {
      zone = await prisma.deliveryZone.findUnique({ where: { id: data.deliveryZoneId! } });
      if (!zone) return error("ไม่พบโซนจัดส่ง");
    }

    const subtotal = data.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + product.price * item.quantity;
    }, 0);

    if (!isPickup && zone && zone.minOrder > 0 && subtotal < zone.minOrder) {
      return error(`ต้องสั่งขั้นต่ำ ${zone.minOrder} บาท สำหรับโซนนี้`);
    }

    let discountAmount = 0;
    let coupon = null;
    if (data.couponCode) {
      coupon = await prisma.coupon.findFirst({
        where: {
          code: data.couponCode.toUpperCase(),
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
        where: { couponId: coupon.id, userId: user.id },
      });
      if (userUsed >= coupon.maxUsesPerUser) {
        return error("คุณใช้โค้ดนี้ครบตามจำนวนที่กำหนดแล้ว");
      }
      discountAmount = coupon.type === "PERCENT"
        ? Math.floor(subtotal * coupon.value / 100)
        : Math.min(coupon.value, subtotal);
    }

    const loyalty = await prisma.loyaltySetting.findUnique({ where: { id: "default" } });
    let pointsUsed = 0;
    if (data.pointsToUse > 0 && loyalty) {
      const maxPointsByPercent = Math.floor((subtotal - discountAmount) * loyalty.maxRedeemPercent / 100);
      const maxPointsByBalance = user.pointsBalance;
      const maxPointsByRate = Math.floor((subtotal - discountAmount) / loyalty.redeemRate) * loyalty.redeemRate;
      const availablePoints = Math.min(maxPointsByPercent * loyalty.redeemRate / 1, maxPointsByBalance, maxPointsByRate);
      pointsUsed = Math.min(data.pointsToUse, availablePoints);
      if (pointsUsed < loyalty.minRedeemPoints) pointsUsed = 0;
    }

    const pointsDiscount = loyalty ? Math.floor(pointsUsed / loyalty.redeemRate) : 0;
    const deliveryFee = isPickup ? 0 : (zone?.deliveryFee ?? 0);
    const total = Math.max(0, subtotal - discountAmount - pointsDiscount + deliveryFee);

    const pointsEarned = loyalty ? Math.floor(total / loyalty.earnRate) : 0;

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          orderType: data.orderType,
          addressId: isPickup ? undefined : data.addressId,
          deliveryZoneId: isPickup ? undefined : data.deliveryZoneId,
          couponId: coupon?.id,
          status: data.paymentMethod === "COD" ? "PENDING" : "PENDING_PAYMENT",
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === "COD" ? "PENDING" : "PENDING",
          subtotal,
          discountAmount: discountAmount + pointsDiscount,
          deliveryFee,
          pointsUsed,
          pointsEarned,
          total,
          note: data.note,
          items: {
            create: data.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return { productId: item.productId, quantity: item.quantity, unitPrice: product.price, note: item.note };
            }),
          },
        },
      });

      await tx.payment.create({
        data: { orderId: newOrder.id, method: data.paymentMethod, amount: total },
      });

      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
        await tx.couponUsage.create({ data: { couponId: coupon.id, userId: user.id, orderId: newOrder.id } });
      }

      if (pointsUsed > 0) {
        await tx.user.update({ where: { id: user.id }, data: { pointsBalance: { decrement: pointsUsed } } });
        await tx.pointTransaction.create({
          data: { userId: user.id, orderId: newOrder.id, type: "REDEEM", amount: -pointsUsed, balanceAfter: user.pointsBalance - pointsUsed, note: "ใช้แต้มลดราคา" },
        });
      }

      return newOrder;
    });

    const shortId = order.id.slice(-8).toUpperCase();
    const orderTypeLabel = data.orderType === "PICKUP" ? "รับเองที่ร้าน" : "ส่งถึงบ้าน";
    const paymentLabel = data.paymentMethod === "COD" ? "เงินสดปลายทาง" : "QR PromptPay";
    const itemSummary = data.items.map((item) => {
      const product = allProducts.find((p) => p.id === item.productId);
      return `${product?.name ?? item.productId} ×${item.quantity}`;
    }).join(", ");

    // Web Push — ฟรี 100%
    const pushSubs = await prisma.adminPushSubscription.findMany();
    if (pushSubs.length > 0) {
      const pushResults = await Promise.all(
        pushSubs.map(async (sub) => ({
          endpoint: sub.endpoint,
          ...(await sendWebPush(sub, {
            title: `🛒 ออเดอร์ใหม่ #${shortId}`,
            body: `${user.name ?? user.phone ?? "ลูกค้า"} | ${orderTypeLabel} | ${total.toLocaleString("th-TH")} บาท\n${itemSummary}`,
            url: "/admin/orders",
            tag: `order-${order.id}`,
          })),
        }))
      );
      const deadEndpoints = pushResults.filter((r) => r.gone).map((r) => r.endpoint);
      if (deadEndpoints.length > 0) {
        await prisma.adminPushSubscription.deleteMany({
          where: { endpoint: { in: deadEndpoints } },
        });
      }
    }

    return created({ orderId: order.id, total, paymentMethod: data.paymentMethod });
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    console.error(err);
    return error("เกิดข้อผิดพลาด");
  }
}
