import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, error, unauthorized } from "@/lib/response";

const optionSchema = z.object({
  name: z.string().min(1),
  priceAdded: z.number().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const groupSchema = z.object({
  name: z.string().min(1),
  isRequired: z.boolean().default(false),
  maxChoices: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
  options: z.array(optionSchema),
});

const bodySchema = z.array(groupSchema);

// PUT /api/admin/products/[id]/options — replace all option groups
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return unauthorized(); }
  const { id } = await params;
  try {
    const body = await request.json();
    const groups = bodySchema.parse(body);

    // Delete all existing groups (cascade deletes options)
    await prisma.productOptionGroup.deleteMany({ where: { productId: id } });

    // Re-create
    for (const g of groups) {
      await prisma.productOptionGroup.create({
        data: {
          productId: id,
          name: g.name,
          isRequired: g.isRequired,
          maxChoices: g.maxChoices,
          sortOrder: g.sortOrder,
          options: { create: g.options },
        },
      });
    }

    const updated = await prisma.product.findUnique({
      where: { id },
      include: { optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
    });

    return ok(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return error(err.issues[0].message);
    return error("เกิดข้อผิดพลาด");
  }
}
