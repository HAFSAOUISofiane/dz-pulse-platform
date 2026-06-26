import { Router, type IRouter } from "express";
import { eq, sql, desc, asc, ilike, and, or, inArray, ne } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  pollsTable, pollOptionsTable, categoriesTable, usersTable, votesTable, commentsTable
} from "@workspace/db";
import { ListPollsQueryParams, GetPollBySlugParams, GetRelatedPollsParams } from "@workspace/api-zod";
import { optionalAuthMiddleware, authMiddleware } from "../lib/auth.js";
import { addSSEClient } from "../lib/sse-manager.js";
import { makeUniqueSlug } from "../lib/slugify.js";

const router: IRouter = Router();

type LangCode = "en" | "ar" | "fr";

function pick(base: string, ar: string | null | undefined, fr: string | null | undefined, lang: LangCode) {
  if (lang === "ar" && ar) return ar;
  if (lang === "fr" && fr) return fr;
  return base;
}

function buildPollShape(poll: any, category: any, options: any[], lang: LangCode = "en") {
  return {
    ...poll,
    title: pick(poll.title, poll.titleAr, poll.titleFr, lang),
    subtitle: poll.subtitle ? pick(poll.subtitle, poll.subtitleAr, poll.subtitleFr, lang) : poll.subtitle,
    description: poll.description ? pick(poll.description, poll.descriptionAr, poll.descriptionFr, lang) : poll.description,
    category: {
      id: category.id,
      name: pick(category.name, category.nameAr, category.nameFr, lang),
      slug: category.slug,
      color: category.color,
      icon: category.icon,
    },
    options: options.map((o) => ({
      id: o.id,
      pollId: o.pollId,
      label: pick(o.label, o.labelAr, o.labelFr, lang),
      slug: o.slug,
      displayOrder: o.displayOrder,
      voteCount: o.voteCount,
      percentageCache: o.percentageCache,
      imageUrl: o.imageUrl ?? null,
    })),
    sourceLinks: poll.sourceLinks ?? [],
    tags: poll.tags ?? [],
  };
}

router.get("/polls", optionalAuthMiddleware, async (req, res) => {
  const query = ListPollsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
    return;
  }

  const lang: LangCode = (["ar", "fr", "en"].includes(req.query.lang as string) ? req.query.lang : "en") as LangCode;

  const {
    page = 1, limit = 20, search, category, status, sort = "trending", featured, wilaya
  } = query.data;

  try {
    const conditions: any[] = [eq(pollsTable.isPrivate, false)];

    if (search) conditions.push(ilike(pollsTable.title, `%${search}%`));
    if (status) conditions.push(eq(pollsTable.status, status as any));
    if (featured) conditions.push(eq(pollsTable.isFeatured, true));
    if (wilaya === "national") conditions.push(eq(pollsTable.regionScope, "national"));
    else if (wilaya) conditions.push(eq(pollsTable.wilayaCode, wilaya));

    let orderBy: any;
    if (sort === "latest") {
      orderBy = [desc(pollsTable.createdAt)];
    } else if (sort === "most_voted") {
      orderBy = [desc(pollsTable.totalVotes)];
    } else if (sort === "controversial") {
      // Wilson-score controversy: highest for polls near 50/50 with many votes
      // controversy = totalVotes * (1 - |maxOptionShare - 0.5| * 2)
      orderBy = [
        desc(sql`CASE WHEN ${pollsTable.totalVotes} > 5 THEN
          ${pollsTable.totalVotes}::float * (
            1.0 - ABS(
              COALESCE(
                (SELECT MAX(vote_count)::float / NULLIF(${pollsTable.totalVotes}::float, 0)
                 FROM poll_options WHERE poll_id = ${pollsTable.id}),
                1.0
              ) - 0.5
            ) * 2.0
          )
        ELSE -1 END`),
        desc(pollsTable.totalVotes),
      ];
    } else {
      // Hot score: Reddit/HN-style time-decay with trending boost
      // score = (votes + trending_boost) / (ageHours + 2)^1.8
      orderBy = [
        desc(sql`(
          (${pollsTable.totalVotes}::float + CASE WHEN ${pollsTable.isTrending} THEN 15 ELSE 0 END)
          / POWER(
            GREATEST(EXTRACT(EPOCH FROM (NOW() - ${pollsTable.createdAt})) / 3600.0, 0.0) + 2.0,
            1.8
          )
        )`),
        desc(pollsTable.totalVotes),
      ];
    }

    const offset = (page - 1) * limit;

    let baseQuery = db
      .select({ id: pollsTable.id })
      .from(pollsTable)
      .leftJoin(categoriesTable, eq(pollsTable.categoryId, categoriesTable.id));

    if (category) {
      conditions.push(eq(categoriesTable.slug, category));
    }

    const rawPollMode = req.query.pollMode as string | undefined;
    if (rawPollMode && rawPollMode !== "all") {
      conditions.push(eq((pollsTable as any).pollMode, rawPollMode));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pollsTable)
      .leftJoin(categoriesTable, eq(pollsTable.categoryId, categoriesTable.id))
      .where(where);

    const pollIds = await db
      .select({ id: pollsTable.id })
      .from(pollsTable)
      .leftJoin(categoriesTable, eq(pollsTable.categoryId, categoriesTable.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    if (pollIds.length === 0) {
      res.json({ polls: [], total: count, page, totalPages: Math.ceil(count / limit) });
      return;
    }

    const ids = pollIds.map((r) => r.id);

    const pollsData = await db
      .select()
      .from(pollsTable)
      .where(inArray(pollsTable.id, ids))
      .orderBy(...orderBy);

    const categoriesData = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]));

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

    const polls = pollsData.map((p) => buildPollShape(p, catMap[p.categoryId], optionsMap[p.id] ?? [], lang));

    res.json({ polls, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch polls" });
  }
});

router.get("/polls/:slug", optionalAuthMiddleware, async (req, res) => {
  const params = GetPollBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const lang: LangCode = (["ar", "fr", "en"].includes(req.query.lang as string) ? req.query.lang : "en") as LangCode;

  try {
    const [poll] = await db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.slug, params.data.slug))
      .limit(1);

    if (!poll) {
      res.status(404).json({ error: "Poll not found" });
      return;
    }

    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, poll.categoryId))
      .limit(1);

    const options = await db
      .select()
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, poll.id))
      .orderBy(asc(pollOptionsTable.displayOrder));

    const [{ commentCount }] = await db
      .select({ commentCount: sql<number>`count(*)::int` })
      .from(commentsTable)
      .where(and(eq(commentsTable.pollId, poll.id), eq(commentsTable.status, "visible")));

    res.json({
      ...buildPollShape(poll, category, options, lang),
      commentCount,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch poll" });
  }
});

router.get("/polls/:slug/related", async (req, res) => {
  const params = GetRelatedPollsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid slug" });
    return;
  }

  const lang: LangCode = (["ar", "fr", "en"].includes(req.query.lang as string) ? req.query.lang : "en") as LangCode;

  try {
    const [poll] = await db
      .select({ id: pollsTable.id, categoryId: pollsTable.categoryId })
      .from(pollsTable)
      .where(eq(pollsTable.slug, params.data.slug))
      .limit(1);

    if (!poll) {
      res.json([]);
      return;
    }

    const relatedPolls = await db
      .select()
      .from(pollsTable)
      .where(and(
        eq(pollsTable.categoryId, poll.categoryId),
        eq(pollsTable.status, "open"),
        sql`${pollsTable.id} != ${poll.id}`
      ))
      .orderBy(desc(pollsTable.totalVotes))
      .limit(5);

    const categoriesData = await db.select().from(categoriesTable);
    const catMap = Object.fromEntries(categoriesData.map((c) => [c.id, c]));

    const ids = relatedPolls.map((p) => p.id);
    const optionsData = ids.length > 0 ? await db
      .select()
      .from(pollOptionsTable)
      .where(inArray(pollOptionsTable.pollId, ids))
      .orderBy(asc(pollOptionsTable.displayOrder)) : [];

    const optionsMap: Record<number, any[]> = {};
    for (const o of optionsData) {
      optionsMap[o.pollId] ??= [];
      optionsMap[o.pollId].push(o);
    }

    const result = relatedPolls.map((p) => {
      const cat = catMap[p.categoryId];
      const opts = (optionsMap[p.id] ?? []).map((o) => ({
        id: o.id,
        text: pick(o.text, o.textAr, o.textFr, lang),
        voteCount: o.voteCount,
        displayOrder: o.displayOrder,
      }));
      return {
        id: p.id,
        title: pick(p.title, p.titleAr, p.titleFr, lang),
        slug: p.slug,
        totalVotes: p.totalVotes,
        status: p.status,
        pollType: p.pollType,
        isPrivate: p.isPrivate,
        closesAt: p.closesAt,
        createdAt: p.createdAt,
        options: opts,
        category: cat ? {
          id: cat.id,
          name: pick(cat.name, cat.nameAr, cat.nameFr, lang),
          slug: cat.slug,
          color: cat.color,
          icon: cat.icon,
        } : undefined,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch related polls" });
  }
});

// ── Opinion Timeline ──────────────────────────────────────────────────────────
// GET /api/polls/:slug/timeline?range=7d
// Returns cumulative vote-share % at each time bucket so the chart shows how
// opinion has shifted since the poll launched.
router.get("/polls/:slug/timeline", async (req, res) => {
  const slug = String(req.params.slug ?? "");
  if (!slug) { res.status(400).json({ error: "Missing slug" }); return; }

  const range = String(req.query.range ?? "7d");

  // Map range → (lookback interval string, bucket truncation, number of points)
  const RANGES: Record<string, { interval: string; trunc: string; points: number; labelFmt: "minute" | "hour" | "day" | "week" }> = {
    "1h":  { interval: "1 hour",   trunc: "minute", points: 12, labelFmt: "minute" }, // 5-min buckets × 12
    "24h": { interval: "24 hours", trunc: "hour",   points: 24, labelFmt: "hour"   },
    "7d":  { interval: "7 days",   trunc: "day",    points:  7, labelFmt: "day"    },
    "30d": { interval: "30 days",  trunc: "day",    points: 30, labelFmt: "day"    },
    "90d": { interval: "90 days",  trunc: "week",   points: 13, labelFmt: "week"   },
  };

  const cfg = RANGES[range] ?? RANGES["7d"];

  try {
    const [poll] = await db
      .select({ id: pollsTable.id, totalVotes: pollsTable.totalVotes })
      .from(pollsTable)
      .where(eq(pollsTable.slug, slug))
      .limit(1);

    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

    const options = await db
      .select({ id: pollOptionsTable.id, label: pollOptionsTable.label, voteCount: pollOptionsTable.voteCount })
      .from(pollOptionsTable)
      .where(eq(pollOptionsTable.pollId, poll.id))
      .orderBy(asc(pollOptionsTable.displayOrder));

    if (options.length === 0) { res.json({ buckets: [], options: [] }); return; }

    // Step 1: get all votes for this poll, ordered by time
    // We fetch only option_id + created_at (lightweight)
    const allVotes = await db
      .select({ optionId: votesTable.optionId, createdAt: votesTable.createdAt })
      .from(votesTable)
      .where(eq(votesTable.pollId, poll.id))
      .orderBy(asc(votesTable.createdAt));

    // Step 2: build time buckets spanning [now - interval, now]
    const now = Date.now();
    const lookbackMs: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    const windowMs = lookbackMs[range] ?? lookbackMs["7d"];
    const windowStart = now - windowMs;

    // Generate bucket boundary timestamps evenly across the window
    const bucketBoundaries: number[] = [];
    for (let i = 0; i <= cfg.points; i++) {
      bucketBoundaries.push(windowStart + (windowMs / cfg.points) * i);
    }

    // Step 3: compute cumulative counts per option at each bucket boundary
    // For each boundary t, count = all votes with createdAt <= t
    const optIds = options.map(o => o.id);
    const cumulative: Array<Record<number, number>> = bucketBoundaries.map(t => {
      const counts: Record<number, number> = {};
      for (const id of optIds) counts[id] = 0;
      for (const v of allVotes) {
        if (v.createdAt.getTime() <= t) counts[v.optionId] = (counts[v.optionId] ?? 0) + 1;
      }
      return counts;
    });

    // Step 4: convert to percentage of total at each bucket
    function formatLabel(ts: number, fmt: typeof cfg.labelFmt): string {
      const d = new Date(ts);
      if (fmt === "minute") return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      if (fmt === "hour")   return `${String(d.getHours()).padStart(2, "0")}h`;
      if (fmt === "day")    return d.toLocaleDateString("en-DZ", { month: "short", day: "numeric" });
      if (fmt === "week")   return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-DZ", { month: "short" })}`;
      return "";
    }

    const buckets = bucketBoundaries.map((t, i) => {
      const counts = cumulative[i];
      const total = optIds.reduce((s, id) => s + (counts[id] ?? 0), 0);
      const point: Record<string, any> = { label: formatLabel(t, cfg.labelFmt), ts: t };
      for (const id of optIds) {
        point[id] = total > 0 ? +((counts[id] / total) * 100).toFixed(1) : +(100 / optIds.length).toFixed(1);
      }
      return point;
    });

    res.json({ buckets, options: options.map(o => ({ id: o.id, label: o.label, voteCount: o.voteCount })), hasRealData: allVotes.length > 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

// ── SSE: live vote counts ─────────────────────────────────────────────────────
// GET /api/polls/:slug/live
// Streams poll vote updates as Server-Sent Events to connected clients.
router.get("/polls/:slug/live", async (req, res) => {
  const slug = String(req.params.slug ?? "");
  if (!slug) { res.status(400).end(); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const cleanup = addSSEClient(slug, res);

  req.on("close", cleanup);
  req.on("aborted", cleanup);
});

// ── Create private poll (authenticated users, no admin review) ────────────────
// POST /api/polls/create-private  (no auth required — anonymous creation allowed)
router.post("/polls/create-private", optionalAuthMiddleware, async (req, res) => {
  const {
    title, titleAr, titleFr,
    subtitle, subtitleAr, subtitleFr,
    description, descriptionAr, descriptionFr,
    imageUrl,
    categoryId, options: rawOptions,
    pollType = "multiple_choice",
    pollLanguage = "en",
    regionScope = "national",
    wilayaCode,
    tags = [],
    closesAt,
    status = "open",
  } = req.body as {
    title?: string; titleAr?: string; titleFr?: string;
    subtitle?: string; subtitleAr?: string; subtitleFr?: string;
    description?: string; descriptionAr?: string; descriptionFr?: string;
    imageUrl?: string;
    categoryId?: number;
    options?: (string | { label: string; labelAr?: string; labelFr?: string; imageUrl?: string })[];
    pollType?: string;
    pollLanguage?: string;
    regionScope?: string;
    wilayaCode?: string;
    tags?: string[];
    closesAt?: string;
    status?: string;
  };

  if (!title?.trim()) { res.status(400).json({ error: "Title is required" }); return; }
  if (!categoryId || isNaN(Number(categoryId))) { res.status(400).json({ error: "categoryId is required" }); return; }

  const normalizedOptions = (rawOptions ?? []).map((o) =>
    typeof o === "string" ? { label: o, labelAr: undefined, labelFr: undefined, imageUrl: undefined } : o
  );
  const validOptions = normalizedOptions.filter((o) => o?.label?.trim());
  if (validOptions.length < 2) { res.status(400).json({ error: "At least 2 options required" }); return; }

  try {
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, Number(categoryId)));
    if (!category) { res.status(400).json({ error: "Category not found" }); return; }

    const slug = await makeUniqueSlug(title.trim());
    const [poll] = await db.insert(pollsTable).values({
      title: title.trim(),
      titleAr: titleAr?.trim() || null,
      titleFr: titleFr?.trim() || null,
      subtitle: subtitle?.trim() || null,
      subtitleAr: subtitleAr?.trim() || null,
      subtitleFr: subtitleFr?.trim() || null,
      description: description?.trim() || null,
      descriptionAr: descriptionAr?.trim() || null,
      descriptionFr: descriptionFr?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      slug,
      categoryId: Number(categoryId),
      pollType: (pollType === "binary" ? "binary" : "multiple_choice") as any,
      pollLanguage: (["en", "ar", "fr"].includes(pollLanguage) ? pollLanguage : "en"),
      pollMode: (["professional", "social"].includes((req.body as any).pollMode) ? (req.body as any).pollMode : "all"),
      regionScope: (regionScope === "wilaya" ? "wilaya" : "national") as any,
      wilayaCode: regionScope === "wilaya" ? (wilayaCode ?? null) : null,
      status: (status === "draft" ? "draft" : "open") as any,
      isPrivate: true,
      createdBy: (req as any).user?.userId ?? null,
      tags: tags ?? [],
      closesAt: closesAt ? new Date(closesAt) : null,
    } as any).returning();

    const optionRows = validOptions.map((o, i) => ({
      pollId: poll.id,
      label: o.label.trim(),
      labelAr: o.labelAr?.trim() || null,
      labelFr: o.labelFr?.trim() || null,
      imageUrl: o.imageUrl?.trim() || null,
      slug: o.label.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      displayOrder: i,
    }));
    await db.insert(pollOptionsTable).values(optionRows as any);

    res.status(201).json({ poll: { id: poll.id, slug: poll.slug, title: poll.title, isPrivate: poll.isPrivate, status: poll.status } });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

export default router;
