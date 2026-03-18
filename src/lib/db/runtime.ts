import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { SCHEMA_INIT_SQL } from "./schema";

export interface DbClient {
  db: ReturnType<typeof drizzle>;
  sql: ReturnType<typeof postgres>;
}

const clientCache = new Map<string, DbClient>();

function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `db_${Math.abs(hash).toString(36)}`;
}

/**
 * Create a Drizzle ORM client from a connection URL.
 * Cached per URL hash to avoid redundant connections.
 */
export function createDbClient(dbUrl: string): DbClient {
  const key = hashUrl(dbUrl);

  const cached = clientCache.get(key);
  if (cached) return cached;

  const sqlClient = postgres(dbUrl, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  const db = drizzle(sqlClient, { schema });
  const client: DbClient = { db, sql: sqlClient };

  clientCache.set(key, client);
  return client;
}

/**
 * Test database connection with SELECT 1.
 */
export async function testConnection(
  dbUrl: string
): Promise<{ ok: boolean; error?: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const sqlClient = postgres(dbUrl, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
    });

    await sqlClient`SELECT 1 as connected`;
    await sqlClient.end();

    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Initialize schema — runs CREATE TABLE IF NOT EXISTS.
 */
export async function initSchema(dbUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { sql: sqlClient } = createDbClient(dbUrl);
    await sqlClient.unsafe(SCHEMA_INIT_SQL);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Schema init failed",
    };
  }
}

/**
 * Get a cached client or null if none exists.
 */
export function getClient(dbUrl: string): DbClient | null {
  const key = hashUrl(dbUrl);
  return clientCache.get(key) ?? null;
}

/**
 * Close and clear a cached client.
 */
export async function clearClient(dbUrl: string): Promise<void> {
  const key = hashUrl(dbUrl);
  const cached = clientCache.get(key);
  if (cached) {
    await cached.sql.end();
    clientCache.delete(key);
  }
}
