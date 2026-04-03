import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { ok, error } from "@/lib/response";

const schema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.role !== "ADMIN" || !user.passwordHash) {
      return error("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return error("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    }

    const token = await signToken({ userId: user.id, role: "ADMIN" });

    const response = ok({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    (response as NextResponse).cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
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
