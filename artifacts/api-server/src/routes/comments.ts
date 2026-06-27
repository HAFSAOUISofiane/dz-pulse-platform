import { Router, type IRouter } from "express";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { pollsTable, commentsTable, usersTable } from "@workspace/db";
import {
  ListCommentsQueryParams,
  CreateCommentBody,
  CreateCommentParams,
  ListCommentsParams,
} from "@workspace/api-zod";
import { authMiddleware, optionalAuthMiddleware } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/polls/:slug/comments", optionalAuthMiddleware, async (req, res) => {
  const params = ListCommentsParams.safeParse(req.params);
  const query = ListCommentsQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { page = 1, limit = 20 } = query.data;

  try {
    const [poll] = await db
      .select({ id: pollsTable.id })
      .from(pollsTable)
      .where(eq(pollsTable.slug, params.data.slug))
      .limit(1);

    if (!poll) {
      res.status(404).json({ error: "Poll not found" });
      return;
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(commentsTable)
      .where(
        and(
          eq(commentsTable.pollId, poll.id),
          eq(commentsTable.status, "visible"),
          isNull(commentsTable.parentId)
        )
      );

    const topLevel = await db
      .select({
        id: commentsTable.id,
        pollId: commentsTable.pollId,
        parentId: commentsTable.parentId,
        body: commentsTable.body,
        status: commentsTable.status,
        upvotes: commentsTable.upvotes,
        createdAt: commentsTable.createdAt,
        updatedAt: commentsTable.updatedAt,
        userId: commentsTable.userId,
        userName: usersTable.name,
        userUsername: usersTable.username,
      })
      .from(commentsTable)
      .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
      .where(
        and(
          eq(commentsTable.pollId, poll.id),
          eq(commentsTable.status, "visible"),
          isNull(commentsTable.parentId)
        )
      )
      .orderBy(desc(commentsTable.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const commentIds = topLevel.map((c) => c.id);
    const replies = commentIds.length > 0
      ? await db
          .select({
            id: commentsTable.id,
            pollId: commentsTable.pollId,
            parentId: commentsTable.parentId,
            body: commentsTable.body,
            status: commentsTable.status,
            upvotes: commentsTable.upvotes,
            createdAt: commentsTable.createdAt,
            updatedAt: commentsTable.updatedAt,
            userId: commentsTable.userId,
            userName: usersTable.name,
            userUsername: usersTable.username,
          })
          .from(commentsTable)
          .leftJoin(usersTable, eq(commentsTable.userId, usersTable.id))
          .where(
            and(
              eq(commentsTable.pollId, poll.id),
              eq(commentsTable.status, "visible"),
              sql`${commentsTable.parentId} = ANY(ARRAY[${sql.join(commentIds.map(id => sql`${id}`), sql`, `)}]::int[])`
            )
          )
          .orderBy(commentsTable.createdAt)
      : [];

    function formatComment(c: any) {
      return {
        id: c.id,
        pollId: c.pollId,
        parentId: c.parentId,
        body: c.body,
        status: c.status,
        upvotes: c.upvotes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user: { id: c.userId, name: c.userName, username: c.userUsername },
        replies: [],
      };
    }

    const repliesMap: Record<number, any[]> = {};
    for (const r of replies) {
      repliesMap[r.parentId!] ??= [];
      repliesMap[r.parentId!].push(formatComment(r));
    }

    const comments = topLevel.map((c) => ({
      ...formatComment(c),
      replies: repliesMap[c.id] ?? [],
    }));

    res.json({ comments, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/polls/:slug/comments", authMiddleware, async (req, res) => {
  const params = CreateCommentParams.safeParse(req.params);
  const body = CreateCommentBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const userId = req.user!.userId;

  try {
    const [poll] = await db
      .select({ id: pollsTable.id })
      .from(pollsTable)
      .where(eq(pollsTable.slug, params.data.slug))
      .limit(1);

    if (!poll) {
      res.status(404).json({ error: "Poll not found" });
      return;
    }

    const [comment] = await db
      .insert(commentsTable)
      .values({
        pollId: poll.id,
        userId,
        body: body.data.body,
        parentId: body.data.parentId ?? null,
      })
      .returning();

    const [user] = await db
      .select({ name: usersTable.name, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    res.status(201).json({
      id: comment.id,
      pollId: comment.pollId,
      parentId: comment.parentId,
      body: comment.body,
      status: comment.status,
      upvotes: comment.upvotes,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: { id: userId, name: user.name, username: user.username },
      replies: [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// ── Upvote a comment ──────────────────────────────────────────────────────────
// POST /api/polls/:slug/comments/:commentId/upvote
// Increments the upvotes counter. Lightweight — no per-user tracking in DB.
// The client tracks which comments it has upvoted in localStorage.
router.post("/polls/:slug/comments/:commentId/upvote", async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (isNaN(commentId) || commentId <= 0) {
    res.status(400).json({ error: "Invalid comment id" });
    return;
  }

  try {
    const [comment] = await db
      .update(commentsTable)
      .set({ upvotes: sql`${commentsTable.upvotes} + 1` })
      .where(and(eq(commentsTable.id, commentId), eq(commentsTable.status, "visible")))
      .returning({ id: commentsTable.id, upvotes: commentsTable.upvotes });

    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    res.json({ id: comment.id, upvotes: comment.upvotes });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to upvote comment" });
  }
});

export default router;

