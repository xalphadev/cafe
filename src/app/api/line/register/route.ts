import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { ok, error, unauthorized } from "@/lib/response";
import { getSession } from "@/lib/auth";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
});

/**
 * ผูกเบอร์โทรกับบัญชี LINE ที่มีอยู่แล้ว (optional step)
 * เรียกจาก profile page เมื่อ user ต้องการเพิ่มเบอร์โทร
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const { phone } = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing && existing.id !== session.userId) {
      return error("เบอร์นี้มีบัญชีอยู่แล้ว", 409);
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { phone },
    });

    const token = await signToken({ userId: user.id, role: user.role, phone: user.phone ?? undefined });
    const res = ok({ user: { id: user.id, phone: user.phone, name: user.name, role: user.role, pointsBalance: user.pointsBalance } });
    res.headers.set(
      "Set-Cookie",
      `auth-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
    return res;
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
