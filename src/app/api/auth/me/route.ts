import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

/** 200 + success:false เมื่อยังไม่ล็อกอิน — ลด 401 ใน DevTools ที่มักถูกเข้าใจผิดว่าเป็น error ของ LINE */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, data: null }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, name: true, role: true, pointsBalance: true, email: true },
  });

  if (!user) {
    return NextResponse.json({ success: false, data: null }, { status: 200 });
  }
  return ok(user);
}
