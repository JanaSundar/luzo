/**
 * Drizzle ORM schema — minimal, JSON-first.
 *
 * Tables:
 * - collections: named groupings
 * - requests: saved API requests (JSONB)
 * - pipelines: saved pipeline configs (JSONB)
 */

import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const collections = pgTable("luzo_collections", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const requests = pgTable("luzo_requests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  collectionId: text("collection_id").references(() => collections.id, { onDelete: "cascade" }),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pipelines = pgTable("luzo_pipelines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Raw SQL for schema init — CREATE TABLE IF NOT EXISTS.
 * Used during runtime connection, not via drizzle migrations.
 */
export const SCHEMA_INIT_SQL = `
CREATE TABLE IF NOT EXISTS luzo_collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS luzo_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  collection_id TEXT REFERENCES luzo_collections(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS luzo_pipelines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
