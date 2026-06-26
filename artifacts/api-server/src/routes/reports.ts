import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { SubmitReportBody } from "@workspace/api-zod";
import { authMiddleware } from "../lib/auth.js";

const router: IRouter = Router();

router.post("/reports", authMiddleware, async (req, res) => {
  const body = SubmitReportBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const userId = req.user!.userId;

  try {
    const [report] = await db
      .insert(reportsTable)
      .values({
        entityType: body.data.entityType,
        entityId: body.data.entityId,
        reportedBy: userId,
        reason: body.data.reason,
        note: body.data.note ?? null,
      })
      .returning();

    res.status(201).json(report);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
