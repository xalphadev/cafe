import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");

  const products = await prisma.product.findMany({
    where: {
      isAvailable: true,
      ...(categoryId ? { categoryId } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      category: true,
      optionGroups: {
        where: {},
        orderBy: { sortOrder: "asc" },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return ok(products);
}
