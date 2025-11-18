import { sqliteTable, text, integer, sqliteTableCreator } from 'drizzle-orm/sqlite-core';

/**
 * Create a table with the given name and schema.
 * This is a helper to make it easier to switch between different database types.
 */
const createTable = sqliteTableCreator((name) => name);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = createTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: text("email", { length: 320 }),
  loginMethod: text("loginMethod", { length: 64 }),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: 'timestamp' }).notNull().$onUpdateFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Cases table: Stores legal case queries and metadata
 */
export const cases = createTable("cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().references(() => users.id),
  title: text("title", { length: 255 }).notNull(),
  description: text("description"),
  query: text("query").notNull(),
  status: text("status", { enum: ["pending", "processing", "completed", "failed"] }).default("pending").notNull(),
  createdAt: integer("createdAt", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: 'timestamp' }).notNull().$onUpdateFn(() => new Date()),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

/**
 * Agent logs table: Tracks agent execution, communication, and reasoning
 */
export const agentLogs = createTable("agentLogs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("caseId").notNull().references(() => cases.id),
  agentName: text("agentName", { length: 64 }).notNull(),
  action: text("action", { length: 64 }).notNull(),
  input: text("input"),
  output: text("output"),
  reasoning: text("reasoning"),
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = typeof agentLogs.$inferInsert;

/**
 * Results table: Stores final research findings and structured data
 */
export const results = createTable("results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("caseId").notNull().references(() => cases.id),
  summary: text("summary"),
  findings: text("findings"),
  precedents: text("precedents"),
  statutes: text("statutes"),
  recommendation: text("recommendation"),
  createdAt: integer("createdAt", { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type Result = typeof results.$inferSelect;
export type InsertResult = typeof results.$inferInsert;
