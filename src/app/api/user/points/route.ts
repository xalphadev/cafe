import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { pointsBalance: true } }),
    prisma.pointTransaction.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return ok({ balance: user?.pointsBalance ?? 0, transactions });
}
