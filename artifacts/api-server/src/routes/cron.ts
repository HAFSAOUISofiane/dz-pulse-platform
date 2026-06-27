import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { pollsTable } from "@workspace/db";

const router: IRouter = Router();

// POST /api/cron/run — called by GitHub Actions on a schedule
// Protected by CRON_SECRET header check when env var is set
router.post("/cron/run", async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers["x-cron-secret"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const results = { closed: 0, opened: 0, trendingUpdated: false };

  try {
    // 1. Auto-close polls whose closesAt has passed
    const closedRows = await db
      .update(pollsTable)
      .set({ status: "closed" })
      .where(
        and(
          eq(pollsTable.status, "open"),
          sql`${pollsTable.closesAt} IS NOT NULL AND ${pollsTable.closesAt} < NOW()`
        )
      )
      .returning({ id: pollsTable.id });
    results.closed = closedRows.length;

    // 2. Auto-open upcoming polls whose opensAt has passed
    const openedRows = await db
      .update(pollsTable)
      .set({ status: "open" })
      .where(
        and(
          eq(pollsTable.status, "upcoming"),
          sql`${pollsTable.opensAt} IS NOT NULL AND ${pollsTable.opensAt} <= NOW()`
        )
      )
      .returning({ id: pollsTable.id });
    results.opened = openedRows.length;

    // 3. Auto-compute isTrending based on vote velocity in last 24h
    // Mark as trending if >10 votes in last 24h; clear the flag if ≤5
    await db.execute(sql.raw(`
      UPDATE polls
      SET is_trending = (
        SELECT COUNT(*) > 10
        FROM votes
        WHERE votes.poll_id = polls.id
          AND votes.created_at > NOW() - INTERVAL '24 hours'
      )
      WHERE status = 'open'
    `));
    results.trendingUpdated = true;

    res.json({ ok: true, ...results, timestamp: new Date().toISOString() });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Cron job failed", details: err?.message });
  }
});

export default router;
