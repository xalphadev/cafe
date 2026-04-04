import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  let session;
  try { session = await requireAdmin(); } catch { return unauthorized(); }

  try {
    const body = await request.json();
    const { endpoint, keys } = subscribeSchema.parse(body);

    await prisma.adminPushSubscription.upsert({
      where: { endpoint },
      create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth },
    });

    return ok({ subscribed: true });
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}

export async function DELETE(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  try {
    const { endpoint } = await request.json();
    await prisma.adminPushSubscription.deleteMany({ where: { endpoint } });
    return ok({ unsubscribed: true });
  } catch {
    return error("เกิดข้อผิดพลาด");
  }
}
