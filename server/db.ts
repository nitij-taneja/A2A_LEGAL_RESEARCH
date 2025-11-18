import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { users, cases, agentLogs, results } from "../drizzle/sqlite-schema";
import { ENV } from './_core/env';

type InsertUser = Omit<typeof users.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'lastSignedIn'> & {
  id?: number;
};

// Initialize SQLite database
const configuredUrl = (ENV.databaseUrl || process.env.DATABASE_URL || '').trim();
let resolvedPath: string;
if (!configuredUrl) {
  resolvedPath = './local.db';
} else if (configuredUrl.startsWith('file:')) {
  // Handle forms like 'file:./local.db' or 'file://./local.db'
  let p = configuredUrl.replace(/^file:/, '');
  if (p.startsWith('//')) p = p.slice(2);
  if (!p || p === '.') p = './local.db';
  resolvedPath = p;
} else if (configuredUrl.includes('://')) {
  console.warn(`[DB] DATABASE_URL looks like a URL (${configuredUrl}); expected a file path. Falling back to ./local.db`);
  resolvedPath = './local.db';
} else {
  resolvedPath = configuredUrl;
}

const absoluteDbPath = path.isAbsolute(resolvedPath)
  ? resolvedPath
  : path.resolve(process.cwd(), resolvedPath);
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const sqlite = new Database(absoluteDbPath);
let _db: ReturnType<typeof drizzle>;

// Initialize the database connection
export function getDb() {
  if (!_db) {
    try {
      console.log(`[DB] Opening SQLite at: ${absoluteDbPath}`);
      _db = drizzle(sqlite);
    } catch (error) {
      console.error("[Database] Failed to initialize database:", error);
      throw error;
    }
  }
  return _db;
}

export async function getUserByOpenId(openId: string) {
  const db = getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.select()
      .from(users)
      .where(eq(users.openId, openId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("[Database] Failed to get user by openId:", error);
    throw error;
  }
}

// User queries
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  
  const db = getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    // First try to update if user exists
    const updateValues: Record<string, any> = {
      name: user.name,
      email: user.email,
      loginMethod: user.loginMethod,
      lastSignedIn: new Date(),
      updatedAt: new Date(),
    };
    
    // Remove undefined values
    Object.keys(updateValues).forEach(key => {
      if (updateValues[key] === undefined) {
        delete updateValues[key];
      }
    });
    
    const result = await db.update(users)
      .set(updateValues)
      .where(eq(users.openId, user.openId));
      
    // If no rows were updated, insert a new user
    if (result.changes === 0) {
      const role = user.openId === ENV.ownerOpenId ? 'admin' as const : 'user' as const;

      const now = new Date();
      await db.insert(users).values({
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        loginMethod: user.loginMethod ?? null,
        role,
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
      });
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getCaseById(caseId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db.select()
      .from(cases)
      .where(eq(cases.id, caseId))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get case:", error);
    throw error;
  }
}

export async function getUserCases(userId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    return await db.select()
      .from(cases)
      .where(eq(cases.userId, userId))
      .orderBy(desc(cases.createdAt));
  } catch (error) {
    console.error("[Database] Failed to get user cases:", error);
    throw error;
  }
}

// Alias for router compatibility
export const getCasesByUserId = getUserCases;

export async function ensureDemoUser(): Promise<number> {
  const db = getDb();
  const openId = "demo@local";
  let demo = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (demo.length === 0) {
    const now = new Date();
    console.log("[DB] Inserting demo user");
    await db.insert(users).values({
      openId,
      email: openId,
      name: "Demo User",
      role: 'user',
      loginMethod: 'local',
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    });
    demo = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  }
  return demo[0].id as number;
}

export async function createCase(
  userId: number,
  title: string,
  description: string | null,
  query: string
): Promise<{ insertId: number }> {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  try {
    console.log(`[DB] createCase userId=${userId} title="${title}"`);
    const result = await db
      .insert(cases)
      .values({
        userId,
        title,
        description: description ?? null,
        query,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const id = Number(result.lastInsertRowid);
    console.log(`[DB] createCase OK id=${id}`);
    return { insertId: id };
  } catch (error) {
    console.error("[DB] Failed to create case:", error);
    throw error;
  }
}

export async function updateCaseStatus(caseId: number, status: 'pending' | 'processing' | 'completed' | 'failed') {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cases)
    .set({ status, updatedAt: new Date() })
    .where(eq(cases.id, caseId));
}

export async function getAgentLogsByCaseId(caseId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return await db.select()
    .from(agentLogs)
    .where(eq(agentLogs.caseId, caseId))
    .orderBy(asc(agentLogs.timestamp));
}

export async function addAgentLog(
  caseId: number,
  agentName: string,
  action: string,
  input?: string,
  output?: string,
  reasoning?: string
) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(agentLogs).values({
    caseId,
    agentName,
    action,
    input: input ?? null,
    output: output ?? null,
    reasoning: reasoning ?? null,
    timestamp: new Date(),
  });
}

export async function createResult(
  caseId: number,
  summary: string | null,
  findings: string | null,
  precedents: string | null,
  statutes: string | null,
  recommendation: string | null
) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    await db.insert(results).values({
      caseId,
      summary: summary ?? null,
      findings: findings ?? null,
      precedents: precedents ?? null,
      statutes: statutes ?? null,
      recommendation: recommendation ?? null,
      createdAt: new Date(),
    });
    try { console.log(`[DB] createResult OK caseId=${caseId} summaryLen=${summary?.length ?? 0} findingsLen=${findings?.length ?? 0}`); } catch {}
  } catch (error) {
    console.error("[Database] Failed to create result:", error);
    throw error;
  }
}

export async function getResultByCaseId(caseId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  
  try {
    const result = await db.select()
      .from(results)
      .where(eq(results.caseId, caseId))
      .orderBy(desc(results.createdAt))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get result:", error);
    throw error;
  }
}