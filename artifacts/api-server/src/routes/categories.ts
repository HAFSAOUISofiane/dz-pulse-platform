import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable, pollsTable } from "@workspace/db";
import { GetCategoryBySlugParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  try {
    const categories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        color: categoriesTable.color,
        icon: categoriesTable.icon,
        isActive: categoriesTable.isActive,
        orderIndex: categoriesTable.orderIndex,
        pollCount: sql<number>`count(${pollsTable.id})::int`,
      })
      .from(categoriesTable)
      .leftJoin(pollsTable, eq(pollsTable.categoryId, categoriesTable.id))
      .where(eq(categoriesTable.isActive, true))
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.orderIndex);

    res.json(categories);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/categories/:slug", async (req, res) => {
  const params = GetCategoryBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  try {
    const [category] = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        color: categoriesTable.color,
        icon: categoriesTable.icon,
        isActive: categoriesTable.isActive,
        orderIndex: categoriesTable.orderIndex,
        pollCount: sql<number>`count(${pollsTable.id})::int`,
      })
      .from(categoriesTable)
      .leftJoin(pollsTable, eq(pollsTable.categoryId, categoriesTable.id))
      .where(eq(categoriesTable.slug, params.data.slug))
      .groupBy(categoriesTable.id)
      .limit(1);

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json(category);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

export default router;
