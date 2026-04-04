import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";
import { cookies } from "next/headers";

/**
 * เรียกหลัง login สำเร็จ เพื่อผูก LINE ID ที่ค้างอยู่ใน temp cookie เข้ากับ user
 */
export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();

  const cookieStore = await cookies();
  const linePendingId = cookieStore.get("line_pending_id")?.value;

  if (!linePendingId) return ok({ linked: false });

  cookieStore.delete("line_pending_id");
  cookieStore.delete("line_pending_name");

  try {
    const existing = await prisma.user.findUnique({ where: { lineUserId: linePendingId } });
    if (existing && existing.id !== session.userId) {
      return ok({ linked: false, reason: "already_linked" });
    }
    await prisma.user.update({
      where: { id: session.userId },
      data: { lineUserId: linePendingId },
    });
    return ok({ linked: true });
  } catch {
    return ok({ linked: false });
  }
}
