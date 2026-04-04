import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWebPush } from "@/lib/web-push";
import { ok, error, unauthorized } from "@/lib/response";

export async function POST() {
  let session;
  try { session = await requireAdmin(); } catch { return unauthorized(); }

  const sub = await prisma.adminPushSubscription.findFirst({
    where: { userId: session.userId },
  });

  if (!sub) {
    return error("ยังไม่ได้เปิดรับการแจ้งเตือนในอุปกรณ์นี้ กรุณากดปุ่มแจ้งเตือนก่อน");
  }

  await sendWebPush(sub, {
    title: "🔔 ทดสอบการแจ้งเตือน",
    body: "ระบบแจ้งเตือนพร้อมใช้งานแล้ว! เมื่อมีออเดอร์ใหม่จะส่งแจ้งเตือนมาที่นี่",
    url: "/admin/orders",
    tag: "push-test",
  });

  return ok({ sent: true });
}
