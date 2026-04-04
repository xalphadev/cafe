import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const schema = z.object({
  currentPin: z.string().length(6, "PIN ต้องมี 6 หลัก"),
  newPin: z.string().length(6, "PIN ใหม่ต้องมี 6 หลัก"),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return unauthorized();

  try {
    const body = await request.json();
    const { currentPin, newPin } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { pin: true },
    });

    if (!user) return error("ไม่พบผู้ใช้");
    if (!user.pin) return error("ยังไม่ได้ตั้ง PIN");

    const valid = await bcrypt.compare(currentPin, user.pin);
    if (!valid) return error("PIN ปัจจุบันไม่ถูกต้อง");

    const hashed = await bcrypt.hash(newPin, 12);
    await prisma.user.update({
      where: { id: session.userId },
      data: { pin: hashed, pinSetAt: new Date() },
    });

    return ok({ message: "เปลี่ยน PIN สำเร็จ" });
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
