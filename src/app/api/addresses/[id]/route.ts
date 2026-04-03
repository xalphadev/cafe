import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized, notFound } from "@/lib/response";

const schema = z.object({
  label: z.string().min(1).optional(),
  fullAddress: z.string().min(5).optional(),
  subdistrict: z.string().optional(),
  district: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;

  const address = await prisma.address.findFirst({ where: { id, userId: session.userId } });
  if (!address) return notFound("ไม่พบที่อยู่");

  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId: session.userId }, data: { isDefault: false } });
    }
    const updated = await prisma.address.update({ where: { id }, data });
    return ok(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await params;

  const address = await prisma.address.findFirst({ where: { id, userId: session.userId } });
  if (!address) return notFound("ไม่พบที่อยู่");

  await prisma.address.delete({ where: { id } });
  return ok({ message: "ลบที่อยู่แล้ว" });
}
