import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, created, error, unauthorized } from "@/lib/response";

const schema = z.object({
  categoryId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  price: z.number().min(0),
  image: z.string().url().optional().or(z.literal("")),
  isAvailable: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  salePrice: z.number().min(0).nullable().optional(),
  saleEndsAt: z.string().nullable().optional(),
  sortOrder: z.number().int().optional().default(0),
});

export async function GET(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const categoryId = searchParams.get("categoryId");

  const products = await prisma.product.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
    include: { category: true, optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
  });
  return ok(products);
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const product = await prisma.product.create({
      data: {
        ...data,
        image: data.image || null,
        saleEndsAt: data.saleEndsAt ? new Date(data.saleEndsAt) : null,
      },
    });
    return created(product);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
