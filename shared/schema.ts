import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gladstoneRef: text("gladstone_ref").notNull().unique(),
  clientRefs: text("client_refs").array(),
  notificationReceivedAt: timestamp("notification_received_at"),
  surveyDate: timestamp("survey_date"),
  surveyDateFixedAt: timestamp("survey_date_fixed_at"),
  plaSentToRonnieAt: timestamp("pla_sent_to_ronnie_at"),
  branch: text("branch"),
  insurer: text("insurer"),
  consignee: text("consignee"),
  commodity: text("commodity"),
  latestEmailDate: timestamp("latest_email_date"),
  latestEmailSnippet: text("latest_email_snippet"),
  status: text("status").notNull().default("NOTIFIED"),
});

export const gmailSyncState = pgTable("gmail_sync_state", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mailbox: text("mailbox").notNull().unique(),
  lastHistoryId: text("last_history_id"),
  lastSyncedAt: timestamp("last_synced_at"),
  lastMessageDate: timestamp("last_message_date"),
  totalProcessed: text("total_processed").default("0"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
});

export const insertGmailSyncStateSchema = createInsertSchema(gmailSyncState).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertGmailSyncState = z.infer<typeof insertGmailSyncStateSchema>;
export type GmailSyncState = typeof gmailSyncState.$inferSelect;
