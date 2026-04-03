import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { ok, error } from "@/lib/response";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  pin:   z.string().length(6, "PIN ต้องมี 6 หลัก"),
});

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = schema.parse(await request.json());

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.pin) return error("ไม่พบบัญชีนี้ หรือยังไม่ได้ตั้ง PIN");

    const valid = await bcrypt.compare(pin, user.pin);
    if (!valid) return error("PIN ไม่ถูกต้อง", 401);

    const token = await signToken({ userId: user.id, role: "CUSTOMER", phone });
    const response = ok({ user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
    (response as NextResponse).cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return response;
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
