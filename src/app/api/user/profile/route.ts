import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const patchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  lineNotifyToken: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, lineUserId: true, lineNotifyToken: true },
  });
  return ok({ name: user?.name, lineConnected: !!user?.lineUserId });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();
  try {
    const body = await request.json();
    const data = patchSchema.parse(body);
    const user = await prisma.user.update({ where: { id: session.userId }, data });
    return ok({ name: user.name, lineNotifyToken: user.lineNotifyToken });
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return unauthorized();
  await prisma.user.update({
    where: { id: session.userId },
    data: { lineUserId: null },
  });
  return ok({ lineConnected: false });
}
