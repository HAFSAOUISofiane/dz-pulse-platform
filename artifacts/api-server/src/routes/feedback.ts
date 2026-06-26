import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { platformFeedbackTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/feedback", async (req, res) => {
  const { name, email, message, category } = req.body ?? {};
  if (!message || typeof message !== "string" || message.trim().length < 10) {
    res.status(400).json({ error: "Message must be at least 10 characters" });
    return;
  }
  const validCategories = ["bug", "feature", "general", "content"] as const;
  const cat = validCategories.includes(category) ? category : "general";
  try {
    await db.insert(platformFeedbackTable).values({
      name: name?.trim() || null,
      email: email?.trim() || null,
      message: message.trim(),
      category: cat,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/admin/feedback", authMiddleware, async (req, res) => {
  if ((req as any).user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const items = await db
      .select()
      .from(platformFeedbackTable)
      .orderBy(desc(platformFeedbackTable.createdAt))
      .limit(200);
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

export default router;
