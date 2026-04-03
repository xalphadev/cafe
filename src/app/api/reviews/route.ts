import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  productId: z.string(),
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const reviews = await prisma.review.findMany({
    where: productId ? { productId } : {},
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const avg = productId
    ? await prisma.review.aggregate({ where: { productId }, _avg: { rating: true }, _count: true })
    : null;

  return ok({ reviews, avg });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const data = schema.parse(body);

    // Verify the user actually ordered this product
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId: session.userId,
        status: "COMPLETED",
        items: { some: { productId: data.productId } },
      },
    });
    if (!order) return error("คุณต้องสั่งและรับสินค้านี้ก่อนถึงจะรีวิวได้");

    const review = await prisma.review.create({
      data: { ...data, userId: session.userId },
      include: { user: { select: { id: true, name: true } } },
    });
    return created(review);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    if ((err as { code?: string }).code === "P2002") return error("คุณรีวิวสินค้านี้ไปแล้ว");
    return error("เกิดข้อผิดพลาด");
  }
}
