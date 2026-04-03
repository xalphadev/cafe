import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, unauthorized } from "@/lib/response";

// GET /api/favorites — list favorites; ?full=true returns full product data
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const full = new URL(request.url).searchParams.get("full") === "true";

  if (full) {
    const favorites = await prisma.favorite.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            category: true,
            optionGroups: {
              orderBy: { sortOrder: "asc" },
              include: { options: { orderBy: { sortOrder: "asc" } } },
            },
          },
        },
      },
    });
    return ok({ ids: favorites.map((f) => f.productId), products: favorites.map((f) => f.product) });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.userId },
    select: { productId: true },
    orderBy: { createdAt: "desc" },
  });

  return ok({ ids: favorites.map((f) => f.productId) });
}

// POST /api/favorites — toggle favorite
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { productId } = await request.json();
  if (!productId) return ok({ error: "productId required" }, 400);

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return ok({ favorited: false });
  } else {
    await prisma.favorite.create({ data: { userId: session.userId, productId } });
    return created({ favorited: true });
  }
}
