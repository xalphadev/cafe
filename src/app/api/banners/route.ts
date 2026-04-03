import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return ok(banners);
}
