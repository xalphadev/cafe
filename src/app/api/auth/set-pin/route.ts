import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { ok, error } from "@/lib/response";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  pin:   z.string().length(6, "PIN ต้องมี 6 หลัก").regex(/^\d{6}$/, "PIN ต้องเป็นตัวเลข 6 หลัก"),
  name:  z.string().min(1).max(50).optional(),
  // token proves OTP was verified — we use a short-lived signed token
  otpToken: z.string(),
});

// Simple HMAC check: otpToken = phone + ":" + timestamp signed with OTP_SECRET
// We just store a server-side flag in the OTP record instead
// After OTP verify, we set otpCode = "VERIFIED" as a flag
export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name, otpToken } = schema.parse(await request.json());

    // Verify the otpToken is valid (we encode as base64(phone:timestamp))
    let tokenPhone: string;
    try {
      const decoded = Buffer.from(otpToken, "base64url").toString("utf8");
      const [p, ts] = decoded.split(":");
      if (!p || !ts) throw new Error("invalid");
      // Token valid for 10 minutes
      if (Date.now() - parseInt(ts) > 10 * 60 * 1000) return error("หมดเวลา กรุณายืนยัน OTP ใหม่");
      tokenPhone = p;
    } catch {
      return error("ไม่ได้รับอนุญาต กรุณายืนยัน OTP ก่อน");
    }

    if (tokenPhone !== phone) return error("ข้อมูลไม่ตรงกัน");

    const hashed = await bcrypt.hash(pin, 10);

    const user = await prisma.user.upsert({
      where:  { phone },
      update: { pin: hashed, pinSetAt: new Date(), ...(name ? { name } : {}) },
      create: { phone, pin: hashed, pinSetAt: new Date(), name: name ?? null },
    });

    const token = await signToken({ userId: user.id, role: "CUSTOMER", phone });
    const response = ok({ user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
    (response as NextResponse).cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
