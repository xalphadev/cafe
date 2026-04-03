import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, unauthorized } from "@/lib/response";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, phone: true, name: true, role: true, pointsBalance: true, email: true },
  });

  if (!user) return unauthorized();
  return ok(user);
}
