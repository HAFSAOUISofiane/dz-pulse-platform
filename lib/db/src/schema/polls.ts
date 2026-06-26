import { pgTable, text, serial, boolean, integer, timestamp, pgEnum, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

export const pollTypeEnum = pgEnum("poll_type", ["binary", "multiple_choice"]);
export const pollStatusEnum = pgEnum("poll_status", ["draft", "open", "closed", "upcoming", "archived"]);
export const regionScopeEnum = pgEnum("region_scope", ["national", "wilaya"]);

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  titleFr: text("title_fr"),
  slug: text("slug").notNull().unique(),
  subtitle: text("subtitle"),
  subtitleAr: text("subtitle_ar"),
  subtitleFr: text("subtitle_fr"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  descriptionFr: text("description_fr"),
  pollLanguage: text("poll_language").notNull().default("en"),
  pollType: pollTypeEnum("poll_type").notNull().default("binary"),
  status: pollStatusEnum("status").notNull().default("draft"),
  regionScope: regionScopeEnum("region_scope").notNull().default("national"),
  wilayaCode: text("wilaya_code"),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  createdBy: integer("created_by").references(() => usersTable.id),
  approvedBy: integer("approved_by").references(() => usersTable.id),
  totalVotes: integer("total_votes").notNull().default(0),
  uniqueVoters: integer("unique_voters").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isTrending: boolean("is_trending").notNull().default(false),
  isPrivate: boolean("is_private").notNull().default(false),
  imageUrl: text("image_url"),
  editorialNote: text("editorial_note"),
  methodologyNote: text("methodology_note"),
  sourceLinks: json("source_links").$type<string[]>().default([]),
  pollMode: text("poll_mode").notNull().default("all"),
  tags: json("tags").$type<string[]>().default([]),
  opensAt: timestamp("opens_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const pollOptionsTable = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => pollsTable.id),
  label: text("label").notNull(),
  labelAr: text("label_ar"),
  labelFr: text("label_fr"),
  slug: text("slug").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
  percentageCache: text("percentage_cache").notNull().default("0"),
  imageUrl: text("image_url"),
});

export const insertPollSchema = createInsertSchema(pollsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPoll = z.infer<typeof insertPollSchema>;
export type Poll = typeof pollsTable.$inferSelect;

export const insertPollOptionSchema = createInsertSchema(pollOptionsTable).omit({ id: true });
export type InsertPollOption = z.infer<typeof insertPollOptionSchema>;
export type PollOption = typeof pollOptionsTable.$inferSelect;
