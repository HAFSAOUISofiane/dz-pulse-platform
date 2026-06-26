import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedbackCategoryEnum = pgEnum("feedback_category", ["bug", "feature", "general", "content"]);

export const platformFeedbackTable = pgTable("platform_feedback", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  message: text("message").notNull(),
  category: feedbackCategoryEnum("category").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlatformFeedbackSchema = createInsertSchema(platformFeedbackTable).omit({ id: true, createdAt: true });
export type InsertPlatformFeedback = z.infer<typeof insertPlatformFeedbackSchema>;
export type PlatformFeedback = typeof platformFeedbackTable.$inferSelect;
