import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { ok, error } from "@/lib/response";
import { cookies } from "next/headers";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  name: z.string().min(1).max(50).optional(),
});

/**
 * เรียกตอน from_line=1 และเบอร์ยังไม่มีในระบบ
 * สร้างบัญชีใหม่โดยไม่ต้อง OTP (LINE ยืนยันตัวตนให้แล้ว)
 */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const linePendingId = cookieStore.get("line_pending_id")?.value;
  const linePendingName = cookieStore.get("line_pending_name")?.value;

  if (!linePendingId) {
    return error("ไม่พบข้อมูล LINE กรุณาเริ่มต้นใหม่", 400);
  }

  try {
    const { phone, name } = schema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      return error("เบอร์นี้มีบัญชีอยู่แล้ว กรุณายืนยัน OTP", 409);
    }

    const displayName = name?.trim() || linePendingName || undefined;

    const user = await prisma.user.create({
      data: {
        phone,
        name: displayName,
        lineUserId: linePendingId,
      },
    });

    cookieStore.delete("line_pending_id");
    cookieStore.delete("line_pending_name");

    const token = await signToken({ userId: user.id, role: user.role, phone: user.phone });

    const res = ok({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        pointsBalance: user.pointsBalance,
      },
    });

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
