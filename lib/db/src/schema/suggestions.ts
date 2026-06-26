import { pgTable, text, serial, integer, timestamp, json, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const moderationStatusEnum = pgEnum("moderation_status", ["pending", "approved", "rejected"]);

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  submittedBy: integer("submitted_by").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  proposedOptions: json("proposed_options").$type<string[]>().notNull().default([]),
  tags: json("tags").$type<string[]>().default([]),
  sourceLinks: json("source_links").$type<string[]>().default([]),
  regionRelevance: text("region_relevance"),
  pollMode: text("poll_mode").notNull().default("all"),
  moderationStatus: moderationStatusEnum("moderation_status").notNull().default("pending"),
  moderatorNote: text("moderator_note"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSuggestionSchema = createInsertSchema(suggestionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestionsTable.$inferSelect;
