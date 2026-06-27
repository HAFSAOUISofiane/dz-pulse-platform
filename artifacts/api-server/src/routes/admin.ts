import { Router, type IRouter } from "express";
import { eq, desc, and, asc, inArray, ilike, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  pollsTable, pollOptionsTable, suggestionsTable, reportsTable, usersTable, categoriesTable,
  votesTable, commentsTable
} from "@workspace/db";
import {
  AdminListSuggestionsQueryParams,
  AdminReviewSuggestionParams,
  AdminReviewSuggestionBody,
  AdminListReportsQueryParams,
  AdminCreatePollBody,
  AdminToggleFeaturePollParams,
  AdminToggleFeaturePollBody,
} from "@workspace/api-zod";
import { authMiddleware, adminMiddleware } from "../lib/auth.js";
import { makeUniqueSlug } from "../lib/slugify.js";

const router: IRouter = Router();

router.use("/admin", authMiddleware);
router.use("/admin", adminMiddleware);

router.get("/admin/suggestions", async (req, res) => {
  const query = AdminListSuggestionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  try {
    const conditions: any[] = [];
    if (query.data.status) conditions.push(eq(suggestionsTable.moderationStatus, query.data.status as any));

    const suggestions = await db
      .select()
      .from(suggestionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(suggestionsTable.createdAt));

    const userIds = [...new Set(suggestions.map((s) => s.submittedBy))];
    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json(suggestions.map((s) => ({
      ...s,
      submittedBy: userMap[s.submittedBy] ?? { id: s.submittedBy, name: "Unknown", username: "unknown" },
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch suggestions" });
  }
});

router.post("/admin/suggestions/:id/review", async (req, res) => {
  const params = AdminReviewSuggestionParams.safeParse(req.params);
  const body = AdminReviewSuggestionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [suggestion] = await db
      .update(suggestionsTable)
      .set({
        moderationStatus: body.data.status as any,
        moderatorNote: body.data.moderatorNote ?? null,
        reviewedBy: req.user!.userId,
      })
      .where(eq(suggestionsTable.id, params.data.id))
      .returning();

    if (!suggestion) {
      res.status(404).json({ error: "Suggestion not found" });
      return;
    }

    res.json({ success: true, suggestion });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to review suggestion" });
  }
});

// Approve suggestion and immediately create a poll from it
router.post("/admin/suggestions/:id/approve-as-poll", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { publishStatus = "draft", categoryId, moderatorNote } = req.body as {
    publishStatus?: "open" | "draft";
    categoryId?: number;
    moderatorNote?: string;
  };

  try {
    const [suggestion] = await db.select().from(suggestionsTable).where(eq(suggestionsTable.id, id));
    if (!suggestion) { res.status(404).json({ error: "Suggestion not found" }); return; }

    const [updated] = await db
      .update(suggestionsTable)
      .set({ moderationStatus: "approved", moderatorNote: moderatorNote ?? null, reviewedBy: req.user!.userId })
      .where(eq(suggestionsTable.id, id))
      .returning();

    const slug = makeUniqueSlug(suggestion.title);
    const resolvedCategoryId = categoryId ?? suggestion.categoryId ?? 1;

    const [poll] = await db.insert(pollsTable).values({
      title: suggestion.title,
      slug,
      description: suggestion.description ?? null,
      subtitle: null,
      imageUrl: null,
      pollType: "multiple_choice",
      status: publishStatus,
      regionScope: "national",
      categoryId: resolvedCategoryId,
      createdBy: req.user!.userId,
      editorialNote: null,
      methodologyNote: null,
      sourceLinks: [],
      tags: [],
    }).returning();

    const options: string[] = Array.isArray(suggestion.proposedOptions) && suggestion.proposedOptions.length >= 2
      ? suggestion.proposedOptions
      : ["Yes", "No"];

    await db.insert(pollOptionsTable).values(
      options.map((label: string, idx: number) => ({
        pollId: poll.id,
        label,
        slug: label.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
        displayOrder: idx,
      }))
    );

    res.status(201).json({ success: true, poll, suggestion: updated });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to approve suggestion as poll" });
  }
});

router.get("/admin/reports", async (req, res) => {
  const query = AdminListReportsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query" });
    return;
  }

  try {
    const conditions: any[] = [];
    if (query.data.status) conditions.push(eq(reportsTable.status, query.data.status as any));

    const reports = await db
      .select()
      .from(reportsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(reportsTable.createdAt));

    const userIds = [...new Set(reports.map((r) => r.reportedBy))];
    const users = userIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, username: usersTable.username }).from(usersTable).where(inArray(usersTable.id, userIds))
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    res.json(reports.map((r) => ({
      ...r,
      reportedBy: userMap[r.reportedBy] ?? { id: r.reportedBy, name: "Unknown", username: "unknown" },
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.get("/admin/polls", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(Math.max(1, Number(req.query.limit ?? 50)), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string | undefined) ?? "";
    const status = (req.query.status as string | undefined) ?? "";

    const conds: any[] = [];
    if (status && status !== "all") conds.push(eq(pollsTable.status, status as any));
    if (search) conds.push(ilike(pollsTable.title, `%${search}%`));
    const whereClause = conds.length > 0 ? and(...conds) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pollsTable)
      .where(whereClause);

    const pollsData = await db
      .select()
      .from(pollsTable)
      .where(whereClause)
      .orderBy(desc(pollsTable.createdAt))
      .limit(limit)
      .offset(offset);

    if (pollsData.length === 0) {
      res.json({ polls: [], total: count, page, totalPages: Math.ceil(count / limit) || 1 });
      return;
    }

    const categoriesData = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]));

    const ids = pollsData.map((p) => p.id);
    const optionsData = await db
      .select()
      .from(pollOptionsTable)
      .where(inArray(pollOptionsTable.pollId, ids))
      .orderBy(asc(pollOptionsTable.displayOrder));

    const optionsMap: Record<number, any[]> = {};
    for (const o of optionsData) {
      optionsMap[o.pollId] ??= [];
      optionsMap[o.pollId].push(o);
    }

    const polls = pollsData.map((p) => {
      const cat = catMap[p.categoryId] ?? { id: 0, name: "Unknown", slug: "", color: null, icon: null };
      return {
        ...p,
        category: { id: cat.id, name: cat.name, slug: cat.slug, color: cat.color, icon: cat.icon },
        options: optionsMap[p.id] ?? [],
      };
    });

    res.json({ polls, total: count, page, totalPages: Math.ceil(count / limit) || 1 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

router.post("/admin/polls", async (req, res) => {
  const body = AdminCreatePollBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body", details: body.error.flatten() });
    return;
  }

  try {
    const slug = makeUniqueSlug(body.data.title);

    const bd = body.data as any;
    const [poll] = await db
      .insert(pollsTable)
      .values({
        title: bd.title,
        titleAr: bd.titleAr ?? null,
        titleFr: bd.titleFr ?? null,
        slug,
        subtitle: bd.subtitle ?? null,
        subtitleAr: bd.subtitleAr ?? null,
        subtitleFr: bd.subtitleFr ?? null,
        description: bd.description ?? null,
        descriptionAr: bd.descriptionAr ?? null,
        descriptionFr: bd.descriptionFr ?? null,
        imageUrl: bd.imageUrl ?? null,
        pollType: bd.pollType as any,
        pollLanguage: bd.pollLanguage ?? "en",
        pollMode: (["professional", "social"].includes(bd.pollMode) ? bd.pollMode : "all"),
        status: (bd.status as any) ?? "open",
        regionScope: bd.regionScope as any ?? "national",
        categoryId: bd.categoryId,
        createdBy: req.user!.userId,
        editorialNote: bd.editorialNote ?? null,
        methodologyNote: bd.methodologyNote ?? null,
        sourceLinks: bd.sourceLinks ?? [],
        tags: bd.tags ?? [],
        closesAt: bd.closesAt ? new Date(bd.closesAt) : null,
      })
      .returning();

    // Options can be either string[] or {label, imageUrl?, labelAr?, labelFr?}[]
    const rawOpts: any[] = bd.options as any;
    const normalizedOpts = rawOpts.map((o: any) =>
      typeof o === "string"
        ? { label: o, labelAr: null, labelFr: null, imageUrl: null }
        : { label: o.label, labelAr: o.labelAr ?? null, labelFr: o.labelFr ?? null, imageUrl: o.imageUrl ?? null }
    );
    await db.insert(pollOptionsTable).values(
      normalizedOpts.map((o, idx: number) => ({
        pollId: poll.id,
        label: o.label,
        labelAr: o.labelAr,
        labelFr: o.labelFr,
        imageUrl: o.imageUrl,
        slug: o.label.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
        displayOrder: idx,
      }))
    );

    res.status(201).json(poll);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

router.post("/admin/polls/:id/feature", async (req, res) => {
  const params = AdminToggleFeaturePollParams.safeParse(req.params);
  const body = AdminToggleFeaturePollBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  try {
    const [poll] = await db
      .update(pollsTable)
      .set({ isFeatured: body.data.isFeatured })
      .where(eq(pollsTable.id, params.data.id))
      .returning();

    if (!poll) {
      res.status(404).json({ error: "Poll not found" });
      return;
    }

    res.json({ success: true, poll });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update poll" });
  }
});

// ── Users management ──────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = (page - 1) * limit;

    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        username: usersTable.username,
        email: usersTable.email,
        role: usersTable.role,
        status: usersTable.status,
        wilaya: usersTable.wilaya,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ users, page, limit });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.patch("/admin/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { role, status } = req.body as { role?: string; status?: string };

  const VALID_ROLES = new Set(["user", "moderator", "admin"]);
  const VALID_STATUSES = new Set(["active", "suspended"]);

  if (role !== undefined && !VALID_ROLES.has(role)) {
    res.status(400).json({ error: "Invalid role. Must be one of: user, moderator, admin" });
    return;
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    res.status(400).json({ error: "Invalid status. Must be one of: active, suspended" });
    return;
  }

  try {
    const updates: Record<string, any> = {};
    if (role) updates.role = role;
    if (status) updates.status = status;

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ success: true, user });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ── Polls CRUD ────────────────────────────────────────────────────────────────

// List all draft polls (admin only)
router.get("/admin/drafts", async (req, res) => {
  try {
    const drafts = await db
      .select({
        id: pollsTable.id,
        title: pollsTable.title,
        subtitle: pollsTable.subtitle,
        slug: pollsTable.slug,
        status: pollsTable.status,
        categoryId: pollsTable.categoryId,
        createdAt: pollsTable.createdAt,
      })
      .from(pollsTable)
      .where(eq(pollsTable.status, "draft"))
      .orderBy(desc(pollsTable.createdAt));

    const catIds = [...new Set(drafts.map(d => d.categoryId).filter(Boolean))];
    const cats = catIds.length > 0
      ? await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable).where(inArray(categoriesTable.id, catIds as number[]))
      : [];
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]));

    res.json(drafts.map(d => ({ ...d, category: catMap[d.categoryId!] ?? { id: d.categoryId, name: "—" } })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

// Get a single poll with its options (for the edit form)
router.get("/admin/polls/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [poll] = await db.select().from(pollsTable).where(eq(pollsTable.id, id));
    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

    const options = await db
      .select()
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, id))
      .orderBy(asc(pollOptionsTable.displayOrder));

    res.json({ ...poll, options });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch poll" });
  }
});

router.patch("/admin/polls/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = [
    "title", "subtitle", "description", "imageUrl", "status",
    "isFeatured", "isTrending", "closesAt", "editorialNote", "methodologyNote",
    "categoryId", "pollType", "regionScope", "wilayaCode", "tags",
  ] as const;

  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  try {
    const [poll] = await db.update(pollsTable).set(updates).where(eq(pollsTable.id, id)).returning();
    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

    // Handle options update if provided
    // Each option: { id?: number, label: string, labelAr?: string, labelFr?: string, imageUrl?: string | null }
    if (Array.isArray(req.body.options) && req.body.options.length >= 2) {
      const incomingOptions: { id?: number; label: string; labelAr?: string; labelFr?: string; imageUrl?: string | null }[] = req.body.options;

      // Get current options with their vote counts
      const existingOptions = await db
        .select({ id: pollOptionsTable.id, voteCount: pollOptionsTable.voteCount })
        .from(pollOptionsTable)
        .where(eq(pollOptionsTable.pollId, id));

      const incomingIds = new Set(incomingOptions.filter(o => o.id).map(o => o.id!));

      // Update labels, translations and imageUrl of existing options
      for (const opt of incomingOptions.filter(o => o.id)) {
        await db
          .update(pollOptionsTable)
          .set({
            label: opt.label,
            labelAr: opt.labelAr ?? null,
            labelFr: opt.labelFr ?? null,
            imageUrl: opt.imageUrl ?? null,
          })
          .where(eq(pollOptionsTable.id, opt.id!));
      }

      // Insert new options
      const newOptions = incomingOptions.filter(o => !o.id);
      const maxOrder = existingOptions.length;
      if (newOptions.length > 0) {
        await db.insert(pollOptionsTable).values(
          newOptions.map((opt, idx) => ({
            pollId: id,
            label: opt.label,
            labelAr: opt.labelAr ?? null,
            labelFr: opt.labelFr ?? null,
            imageUrl: opt.imageUrl ?? null,
            slug: opt.label.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, ""),
            displayOrder: maxOrder + idx,
          }))
        );
      }

      // Delete removed options only if they have 0 votes
      for (const existing of existingOptions) {
        if (!incomingIds.has(existing.id)) {
          const voteCount = typeof existing.voteCount === "number" ? existing.voteCount : 0;
          if (voteCount === 0) {
            await db.delete(pollOptionsTable).where(eq(pollOptionsTable.id, existing.id));
          }
        }
      }
    }

    const options = await db
      .select()
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, id))
      .orderBy(asc(pollOptionsTable.displayOrder));

    res.json({ success: true, poll, options });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update poll" });
  }
});

router.delete("/admin/polls/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(votesTable).where(eq(votesTable.pollId, id));
    await db.delete(commentsTable).where(eq(commentsTable.pollId, id));
    await db.delete(pollOptionsTable).where(eq(pollOptionsTable.pollId, id));
    await db.delete(pollsTable).where(eq(pollsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete poll" });
  }
});

// ── Categories CRUD ───────────────────────────────────────────────────────────
router.post("/admin/categories", async (req, res) => {
  const { name, slug, color, icon, description } = req.body as any;
  if (!name || !slug || !color) { res.status(400).json({ error: "name, slug, color required" }); return; }

  try {
    const [cat] = await db.insert(categoriesTable).values({ name, slug, color, icon: icon ?? "circle", description: description ?? null }).returning();
    res.status(201).json(cat);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.patch("/admin/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, color, icon, description } = req.body as any;
  const updates: Record<string, any> = {};
  if (name) updates.name = name;
  if (color) updates.color = color;
  if (icon) updates.icon = icon;
  if (description !== undefined) updates.description = description;

  try {
    const [cat] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
    if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
    res.json({ success: true, cat });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

export default router;
