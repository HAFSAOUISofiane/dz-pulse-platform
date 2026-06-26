import { Router, type IRouter } from "express";
import { eq, sql, gte, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  pollsTable, votesTable, usersTable, commentsTable, categoriesTable, pollOptionsTable
} from "@workspace/db";
import { GetTrendingPollsQueryParams } from "@workspace/api-zod";
import { asc, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/analytics/summary", async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [[totalPollsRow], [openPollsRow], [totalVotesRow], [totalUsersRow], [totalCommentsRow], [newPollsRow], [newVotesRow]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(pollsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(pollsTable).where(eq(pollsTable.status, "open")),
      db.select({ count: sql<number>`sum(${pollsTable.totalVotes})::int` }).from(pollsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
      db.select({ count: sql<number>`count(*)::int` }).from(commentsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(pollsTable).where(gte(pollsTable.createdAt, oneWeekAgo)),
      db.select({ count: sql<number>`count(*)::int` }).from(votesTable).where(gte(votesTable.createdAt, oneWeekAgo)),
    ]);

    res.json({
      totalPolls: totalPollsRow.count ?? 0,
      openPolls: openPollsRow.count ?? 0,
      totalVotes: totalVotesRow.count ?? 0,
      totalUsers: totalUsersRow.count ?? 0,
      totalComments: totalCommentsRow.count ?? 0,
      newPollsThisWeek: newPollsRow.count ?? 0,
      newVotesThisWeek: newVotesRow.count ?? 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/analytics/trending", async (req, res) => {
  const query = GetTrendingPollsQueryParams.safeParse(req.query);
  const limit = query.success ? (query.data.limit ?? 5) : 5;

  try {
    const polls = await db
      .select()
      .from(pollsTable)
      .where(and(eq(pollsTable.status, "open"), eq(pollsTable.isTrending, true)))
      .orderBy(desc(pollsTable.totalVotes))
      .limit(limit);

    if (polls.length < limit) {
      const remaining = await db
        .select()
        .from(pollsTable)
        .where(eq(pollsTable.status, "open"))
        .orderBy(desc(pollsTable.totalVotes))
        .limit(limit);
      polls.push(...remaining.filter((r) => !polls.find((p) => p.id === r.id)));
    }

    const top = polls.slice(0, limit);
    const categoriesData = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]));

    res.json(top.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      totalVotes: p.totalVotes,
      status: p.status,
      category: {
        id: catMap[p.categoryId]?.id,
        name: catMap[p.categoryId]?.name,
        slug: catMap[p.categoryId]?.slug,
        color: catMap[p.categoryId]?.color,
        icon: catMap[p.categoryId]?.icon,
      },
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch trending polls" });
  }
});

router.get("/analytics/category-breakdown", async (req, res) => {
  try {
    const breakdown = await db
      .select({
        categoryId: pollsTable.categoryId,
        categoryName: categoriesTable.name,
        categorySlug: categoriesTable.slug,
        totalPolls: sql<number>`count(${pollsTable.id})::int`,
        totalVotes: sql<number>`sum(${pollsTable.totalVotes})::int`,
      })
      .from(pollsTable)
      .leftJoin(categoriesTable, eq(pollsTable.categoryId, categoriesTable.id))
      .groupBy(pollsTable.categoryId, categoriesTable.name, categoriesTable.slug)
      .orderBy(desc(sql`sum(${pollsTable.totalVotes})`));

    res.json(breakdown.map((b) => ({
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      categorySlug: b.categorySlug,
      totalPolls: b.totalPolls,
      totalVotes: b.totalVotes ?? 0,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch category breakdown" });
  }
});

export default router;
