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
  gladstoneRef: text("gladstone_ref"),
  policyNumber: text("policy_number"),
  clientRefs: text("client_refs").array(),
  notificationReceivedAt: timestamp("notification_received_at"),
  surveyDate: timestamp("survey_date"),
  surveyDateFixedAt: timestamp("survey_date_fixed_at"),
  plaForwardedInternallyAt: timestamp("pla_forwarded_internally_at"),
  branch: text("branch"),
  insurer: text("insurer"),
  consignee: text("consignee"),
  commodity: text("commodity"),
  latestEmailDate: timestamp("latest_email_date"),
  latestEmailSnippet: text("latest_email_snippet"),
  summary: text("summary"),
  status: text("status").notNull().default("NOTIFIED"),
});

export const threads = pgTable("threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: text("thread_id").notNull().unique(),
  policyNumber: text("policy_number").notNull(),
  subject: text("subject"),
  lastProcessedAt: timestamp("last_processed_at").notNull().defaultNow(),
});

export const pendingThreads = pgTable("pending_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: text("thread_id").notNull().unique(),
  subject: text("subject"),
  snippet: text("snippet"),
  consignee: text("consignee"),
  commodity: text("commodity"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
  threadData: jsonb("thread_data").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  lastProcessedAt: true,
});

export const insertPendingThreadSchema = createInsertSchema(pendingThreads).omit({
  id: true,
  receivedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;
export type InsertPendingThread = z.infer<typeof insertPendingThreadSchema>;
export type PendingThread = typeof pendingThreads.$inferSelect;
