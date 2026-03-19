/**
 * Runtime DB layer — BYODB (Bring Your Own Database)
 *
 * No global singleton. Connection created dynamically from user-provided URL.
 * Optionally cached per dbUrl. All interactions are runtime-driven.
 */

export type { DbClient } from "./runtime";
export type { RuntimeSchemaStatus, RuntimeTableStatus } from "./schema-init";
export { clearClient, createDbClient, getClient, initSchema, testConnection } from "./runtime";
