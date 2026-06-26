import { pgTable, serial, integer, timestamp, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pollsTable } from "./polls";
import { pollOptionsTable } from "./polls";
import { usersTable } from "./users";

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull().references(() => pollsTable.id),
  optionId: integer("option_id").notNull().references(() => pollOptionsTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  anonymousId: text("anonymous_id"),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  wilaya: text("wilaya"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userPollUnique: unique("votes_user_poll_unique").on(table.userId, table.pollId),
}));

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
