import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateOTP, sendOTP } from "@/lib/auth";
import { ok, error } from "@/lib/response";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = schema.parse(body);

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.user.upsert({
      where: { phone },
      update: { otpCode: otp, otpExpiresAt },
      create: { phone, otpCode: otp, otpExpiresAt },
    });

    await sendOTP(phone, otp);

    return ok({
      message: "ส่ง OTP แล้ว",
      phone,
      ...(process.env.NODE_ENV === "development" && { devOtp: otp }),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return error(err.issues[0].message);
    }
    console.error(err);
    return error("เกิดข้อผิดพลาด กรุณาลองใหม่");
  }
}
