import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/response";

export async function GET() {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const rows = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row._count._all;
  }

  return ok(counts);
}
