import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { suggestionsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { SubmitSuggestionBody } from "@workspace/api-zod";
import { optionalAuthMiddleware } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/suggestions", optionalAuthMiddleware, async (req, res) => {
  const body = SubmitSuggestionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body", details: body.error.flatten() });
    return;
  }

  const userId = (req as any).user?.userId ?? null;

  try {
    const [suggestion] = await db
      .insert(suggestionsTable)
      .values({
        submittedBy: userId,
        title: body.data.title,
        description: body.data.description,
        categoryId: body.data.categoryId,
        proposedOptions: body.data.proposedOptions,
        tags: body.data.tags ?? [],
        sourceLinks: body.data.sourceLinks ?? [],
        regionRelevance: body.data.regionRelevance ?? null,
        pollMode: (["professional", "social"].includes((req.body as any).pollMode) ? (req.body as any).pollMode : "all"),
      })
      .returning();

    res.status(201).json(suggestion);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to submit suggestion" });
  }
});

export default router;
