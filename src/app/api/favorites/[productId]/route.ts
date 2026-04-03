import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

// GET /api/favorites/[productId] — check if product is favorited
export async function GET(_: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getSession();
  if (!session) return ok({ favorited: false });

  const { productId } = await params;
  const fav = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: session.userId, productId } },
  });
  return ok({ favorited: !!fav });
}
