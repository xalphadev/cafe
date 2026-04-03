import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  let setting = await prisma.shopSetting.findFirst();
  if (!setting) {
    setting = await prisma.shopSetting.create({ data: { closedDays: [] } });
  }
  return ok(setting);
}
