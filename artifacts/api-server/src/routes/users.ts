import { Router, type IRouter } from "express";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable, votesTable, pollsTable, pollOptionsTable, suggestionsTable, categoriesTable } from "@workspace/db";
import { GetUserProfileParams, GetMyVotedPollsQueryParams } from "@workspace/api-zod";
import { authMiddleware, optionalAuthMiddleware } from "../lib/auth.js";
import { asc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users/:username/profile", optionalAuthMiddleware, async (req, res) => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, params.data.username))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [{ totalVotes }] = await db
      .select({ totalVotes: sql<number>`count(*)::int` })
      .from(votesTable)
      .where(eq(votesTable.userId, user.id));

    const [{ totalSuggestions }] = await db
      .select({ totalSuggestions: sql<number>`count(*)::int` })
      .from(suggestionsTable)
      .where(eq(suggestionsTable.submittedBy, user.id));

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      bio: user.bio ?? null,
      wilaya: user.wilaya ?? null,
      ageRange: user.ageRange ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      createdAt: user.createdAt,
      totalVotes,
      totalSuggestions,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.get("/users/me/voted-polls", authMiddleware, async (req, res) => {
  const query = GetMyVotedPollsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  const { page = 1, limit = 10 } = query.data;
  const userId = req.user!.userId;

  try {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(votesTable)
      .where(eq(votesTable.userId, userId));

    const votes = await db
      .select({ pollId: votesTable.pollId })
      .from(votesTable)
      .where(eq(votesTable.userId, userId))
      .orderBy(desc(votesTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const pollIds = votes.map((v) => v.pollId);

    if (pollIds.length === 0) {
      res.json({ polls: [], total, page, totalPages: Math.ceil(total / limit) });
      return;
    }

    const polls = await db.select().from(pollsTable).where(inArray(pollsTable.id, pollIds));
    const categoriesData = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]));

    const optionsData = await db
      .select()
      .from(pollOptionsTable)
      .where(inArray(pollOptionsTable.pollId, pollIds))
      .orderBy(asc(pollOptionsTable.displayOrder));

    const optionsMap: Record<number, any[]> = {};
    for (const o of optionsData) {
      optionsMap[o.pollId] ??= [];
      optionsMap[o.pollId].push(o);
    }

    const result = polls.map((p) => ({
      ...p,
      sourceLinks: p.sourceLinks ?? [],
      tags: p.tags ?? [],
      category: {
        id: catMap[p.categoryId]?.id,
        name: catMap[p.categoryId]?.name,
        slug: catMap[p.categoryId]?.slug,
        color: catMap[p.categoryId]?.color,
        icon: catMap[p.categoryId]?.icon,
      },
      options: (optionsMap[p.id] ?? []).map((o) => ({
        id: o.id,
        pollId: o.pollId,
        label: o.label,
        slug: o.slug,
        displayOrder: o.displayOrder,
        voteCount: o.voteCount,
        percentageCache: o.percentageCache,
      })),
    }));

    res.json({ polls: result, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch voted polls" });
  }
});

export default router;
