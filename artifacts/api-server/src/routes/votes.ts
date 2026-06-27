import { Router, type IRouter } from "express";
import { eq, and, isNull, asc, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { pollsTable, pollOptionsTable, votesTable, usersTable } from "@workspace/db";
import { CastVoteParams, GetMyVoteParams } from "@workspace/api-zod";
import { optionalAuthMiddleware } from "../lib/auth.js";
import { broadcastPollUpdate } from "../lib/sse-manager.js";
import crypto from "crypto";

const router: IRouter = Router();

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + (process.env.SESSION_SECRET ?? "")).digest("hex");
}

function getClientIp(req: any): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = (typeof forwarded === "string" ? forwarded.split(",")[0] : null)
    ?? req.ip
    ?? req.socket?.remoteAddress
    ?? "unknown";
  return raw.trim();
}

// ── Anonymous vote rate limiter ────────────────────────────────────────────────
const anonVoteLog = new Map<string, number[]>();
const VOTE_WINDOW_MS = 60_000;
const MAX_ANON_VOTES = 8;

// ── CAPTCHA store ──────────────────────────────────────────────────────────────
const captchaChallenges = new Map<string, { answer: number; expiry: number }>();
function cleanupCaptchas() {
  const now = Date.now();
  for (const [token, ch] of captchaChallenges) {
    if (ch.expiry < now) captchaChallenges.delete(token);
  }
}
function makeCaptcha(): { token: string; question: string; answer: number } {
  cleanupCaptchas();
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const token = crypto.randomUUID();
  captchaChallenges.set(token, { answer: a + b, expiry: Date.now() + 120_000 });
  return { token, question: `${a} + ${b}`, answer: a + b };
}

// GET /api/captcha/challenge — returns a fresh math challenge
router.get("/captcha/challenge", (_req, res) => {
  const { token, question } = makeCaptcha();
  res.json({ token, question });
});

interface AnonVoteBodyType {
  optionId: number;
  anonymousId?: string;
  captchaToken?: string;
  captchaAnswer?: number;
}

function parseAnonVoteBody(body: unknown): { success: true; data: AnonVoteBodyType } | { success: false } {
  if (!body || typeof body !== "object") return { success: false };
  const b = body as Record<string, unknown>;
  if (typeof b.optionId !== "number" || !Number.isInteger(b.optionId) || b.optionId <= 0) return { success: false };
  const anonymousId = b.anonymousId == null ? undefined : typeof b.anonymousId === "string" ? b.anonymousId.slice(0, 64) : undefined;
  const captchaToken = typeof b.captchaToken === "string" ? b.captchaToken : undefined;
  const captchaAnswer = typeof b.captchaAnswer === "number" ? b.captchaAnswer : undefined;
  return { success: true, data: { optionId: b.optionId as number, anonymousId, captchaToken, captchaAnswer } };
}

// ── Cast or change vote (anonymous & authenticated) ────────────────────────────
router.post("/polls/:slug/vote", optionalAuthMiddleware, async (req, res) => {
  const params = CastVoteParams.safeParse(req.params);
  const body = parseAnonVoteBody(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { slug } = params.data;
  const { optionId, anonymousId, captchaToken, captchaAnswer } = body.data;
  const userId = req.user?.userId ?? null;
  const ipHash = hashIp(getClientIp(req));

  // ── Anonymous rate limiting + CAPTCHA check ────────────────────────────────
  if (userId === null) {
    if (captchaToken !== undefined && captchaAnswer !== undefined) {
      const challenge = captchaChallenges.get(captchaToken);
      if (!challenge || challenge.expiry < Date.now() || challenge.answer !== captchaAnswer) {
        res.status(400).json({ error: "Wrong answer. Please try again." });
        return;
      }
      captchaChallenges.delete(captchaToken);
      anonVoteLog.delete(ipHash);
    } else {
      const now = Date.now();
      const prev = (anonVoteLog.get(ipHash) ?? []).filter(t => now - t < VOTE_WINDOW_MS);
      if (prev.length >= MAX_ANON_VOTES) {
        const { token, question } = makeCaptcha();
        res.status(429).json({
          error: "Too many vote attempts. Please complete the quick check.",
          requireCaptcha: true,
          captchaToken: token,
          question,
        });
        return;
      }
      prev.push(now);
      anonVoteLog.set(ipHash, prev);
    }
  }

  try {
    const [poll] = await db
      .select()
      .from(pollsTable)
      .where(eq(pollsTable.slug, slug))
      .limit(1);

    if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }
    if (poll.status !== "open") { res.status(422).json({ error: "Poll is not open for voting" }); return; }

    const [option] = await db
      .select()
      .from(pollOptionsTable)
      .where(and(eq(pollOptionsTable.id, optionId), eq(pollOptionsTable.pollId, poll.id)))
      .limit(1);

    if (!option) { res.status(400).json({ error: "Invalid option" }); return; }

    // ── Look up existing vote ─────────────────────────────────────────────────
    let existing: typeof votesTable.$inferSelect | undefined;

    if (userId !== null) {
      // Authenticated: match by userId
      const [row] = await db.select().from(votesTable)
        .where(and(eq(votesTable.userId, userId), eq(votesTable.pollId, poll.id)))
        .limit(1);
      existing = row;
    } else {
      // Anonymous: match by anonymousId first, then fall back to ipHash
      if (anonymousId) {
        const [row] = await db.select().from(votesTable)
          .where(and(eq(votesTable.anonymousId, anonymousId), eq(votesTable.pollId, poll.id), isNull(votesTable.userId)))
          .limit(1);
        existing = row;
      }
      if (!existing) {
        const [row] = await db.select().from(votesTable)
          .where(and(eq(votesTable.ipHash, ipHash), eq(votesTable.pollId, poll.id), isNull(votesTable.userId)))
          .limit(1);
        existing = row;
      }
    }

    if (existing) {
      // ── Vote change ───────────────────────────────────────────────────────
      if (existing.optionId === optionId) {
        // No-op: same option clicked again
        const [currentPoll] = await db.select().from(pollsTable).where(eq(pollsTable.id, poll.id)).limit(1);
        const options = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, poll.id)).orderBy(asc(pollOptionsTable.displayOrder));
        res.json({ success: true, changed: false, optionId, totalVotes: currentPoll.totalVotes, options });
        broadcastPollUpdate(slug, { totalVotes: currentPoll.totalVotes, options: options.map(o => ({ id: o.id, voteCount: o.voteCount, percentageCache: o.percentageCache })) });
        return;
      }

      // Different option: swap the vote
      await db.update(votesTable)
        .set({ optionId, wilaya: existing.wilaya })
        .where(eq(votesTable.id, existing.id));

      await db.update(pollOptionsTable)
        .set({ voteCount: sql`GREATEST(${pollOptionsTable.voteCount} - 1, 0)` })
        .where(eq(pollOptionsTable.id, existing.optionId));

      await db.update(pollOptionsTable)
        .set({ voteCount: sql`${pollOptionsTable.voteCount} + 1` })
        .where(eq(pollOptionsTable.id, optionId));

      const [updatedPoll] = await db.select().from(pollsTable).where(eq(pollsTable.id, poll.id)).limit(1);
      const options = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, poll.id)).orderBy(asc(pollOptionsTable.displayOrder));
      res.json({ success: true, changed: true, optionId, totalVotes: updatedPoll.totalVotes, options });
      broadcastPollUpdate(slug, { totalVotes: updatedPoll.totalVotes, options: options.map(o => ({ id: o.id, voteCount: o.voteCount, percentageCache: o.percentageCache })) });
      return;
    }

    // ── New vote ──────────────────────────────────────────────────────────────
    let voterWilaya: string | null = null;
    if (userId !== null) {
      const [userRow] = await db.select({ wilaya: usersTable.wilaya }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      voterWilaya = userRow?.wilaya ?? null;
    }

    await db.insert(votesTable).values({
      pollId: poll.id,
      optionId,
      userId,
      anonymousId: userId ? null : (anonymousId ?? null),
      ipHash,
      wilaya: voterWilaya,
    });

    await db.update(pollOptionsTable)
      .set({ voteCount: sql`${pollOptionsTable.voteCount} + 1` })
      .where(eq(pollOptionsTable.id, optionId));

    await db.update(pollsTable)
      .set({
        totalVotes: sql`${pollsTable.totalVotes} + 1`,
        uniqueVoters: sql`${pollsTable.uniqueVoters} + 1`,
      })
      .where(eq(pollsTable.id, poll.id));

    // Update percentage cache — single batched CASE WHEN instead of N sequential UPDATEs
    const [updatedPoll] = await db.select().from(pollsTable).where(eq(pollsTable.id, poll.id)).limit(1);
    const options = await db.select().from(pollOptionsTable).where(eq(pollOptionsTable.pollId, poll.id)).orderBy(asc(pollOptionsTable.displayOrder));

    if (options.length > 0) {
      const caseWhen = options
        .map((opt) => `WHEN ${opt.id} THEN '${updatedPoll.totalVotes > 0 ? ((opt.voteCount / updatedPoll.totalVotes) * 100).toFixed(1) : "0"}'`)
        .join(" ");
      await db.execute(sql.raw(`UPDATE poll_options SET percentage_cache = CASE id ${caseWhen} ELSE '0' END WHERE poll_id = ${poll.id}`));
    }

    res.status(201).json({ success: true, changed: false, optionId, totalVotes: updatedPoll.totalVotes, options });
    broadcastPollUpdate(slug, { totalVotes: updatedPoll.totalVotes, options: options.map(o => ({ id: o.id, voteCount: o.voteCount, percentageCache: o.percentageCache })) });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Already voted on this poll" });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Failed to cast vote" });
  }
});

// ── Get my vote ───────────────────────────────────────────────────────────────
// Accepts ?anonymousId= query param for device-based anonymous lookup
router.get("/polls/:slug/my-vote", optionalAuthMiddleware, async (req, res) => {
  const params = GetMyVoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid slug" }); return; }

  const ipHash = hashIp(getClientIp(req));
  const anonymousId = typeof req.query.anonymousId === "string" ? req.query.anonymousId.slice(0, 64) : null;

  try {
    const [poll] = await db
      .select({ id: pollsTable.id })
      .from(pollsTable)
      .where(eq(pollsTable.slug, params.data.slug))
      .limit(1);

    if (!poll) { res.json({ optionId: null }); return; }

    if (req.user) {
      const [vote] = await db
        .select()
        .from(votesTable)
        .where(and(eq(votesTable.userId, req.user.userId), eq(votesTable.pollId, poll.id)))
        .limit(1);
      res.json({ optionId: vote?.optionId ?? null });
      return;
    }

    // Anonymous: check by anonymousId first, then fall back to ipHash
    if (anonymousId) {
      const [vote] = await db
        .select()
        .from(votesTable)
        .where(and(eq(votesTable.anonymousId, anonymousId), eq(votesTable.pollId, poll.id), isNull(votesTable.userId)))
        .limit(1);
      if (vote) {
        res.json({ optionId: vote.optionId });
        return;
      }
    }

    const [vote] = await db
      .select()
      .from(votesTable)
      .where(and(eq(votesTable.ipHash, ipHash), eq(votesTable.pollId, poll.id), isNull(votesTable.userId)))
      .limit(1);
    res.json({ optionId: vote?.optionId ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch vote" });
  }
});

export default router;
