import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { ok, error } from "@/lib/response";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  otp: z.string().length(6, "OTP ต้องมี 6 หลัก"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return error("ไม่พบ OTP สำหรับเบอร์นี้ กรุณาขอ OTP ใหม่");
    }

    if (new Date() > user.otpExpiresAt) {
      return error("OTP หมดอายุแล้ว กรุณาขอ OTP ใหม่");
    }

    if (user.otpCode !== otp) {
      return error("OTP ไม่ถูกต้อง");
    }

    await prisma.user.update({
      where: { phone },
      data: { otpCode: null, otpExpiresAt: null },
    });

    const token = await signToken({ userId: user.id, role: "CUSTOMER", phone });

    const response = ok({ user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
    (response as NextResponse).cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.issues[0].message);
    }
    console.error(err);
    return error("เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}
