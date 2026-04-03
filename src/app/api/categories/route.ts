import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isAvailable: true } } } },
    },
  });
  return ok(categories);
}
