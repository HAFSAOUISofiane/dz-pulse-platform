import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import categoriesRouter from "./categories.js";
import pollsRouter from "./polls.js";
import votesRouter from "./votes.js";
import commentsRouter from "./comments.js";
import suggestionsRouter from "./suggestions.js";
import reportsRouter from "./reports.js";
import analyticsRouter from "./analytics.js";
import adminRouter from "./admin.js";
import usersRouter from "./users.js";
import shareRouter from "./share.js";
import feedbackRouter from "./feedback.js";
import storageRouter from "./storage.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(categoriesRouter);
router.use(pollsRouter);
router.use(votesRouter);
router.use(commentsRouter);
router.use(suggestionsRouter);
router.use(reportsRouter);
router.use(analyticsRouter);
router.use("/share", shareRouter);
router.use(feedbackRouter);
router.use(adminRouter);
router.use(usersRouter);
router.use(storageRouter);

export default router;
