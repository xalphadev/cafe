import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error } from "@/lib/response";

const schema = z.object({
  phone: z.string().regex(/^0[0-9]{9}$/, "เบอร์โทรไม่ถูกต้อง"),
});

export async function POST(request: NextRequest) {
  try {
    const { phone } = schema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, name: true, pin: true },
    });
    return ok({
      exists: !!user,
      hasPin: !!user?.pin,
      name: user?.name ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
