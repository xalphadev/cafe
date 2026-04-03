import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const zones = await prisma.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { deliveryFee: "asc" },
  });
  return ok(zones);
}
