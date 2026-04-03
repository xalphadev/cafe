import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  label: z.string().min(1),
  fullAddress: z.string().min(5),
  subdistrict: z.string().optional(),
  district: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok(addresses);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const data = schema.parse(body);
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.userId },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.create({
      data: { ...data, userId: session.userId },
    });
    return created(address);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
