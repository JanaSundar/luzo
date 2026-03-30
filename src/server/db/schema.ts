/**
 * Drizzle ORM schema — minimal, JSON-first.
 *
 * Tables:
 * - collections: named groupings
 * - requests: saved API requests (JSONB)
 * - pipelines: saved pipeline configs (JSONB)
 * - templates: saved user templates (JSONB)
 */

import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

export const templates = pgTable("luzo_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull(),
  complexity: text("complexity").notNull(),
  sourceType: text("source_type").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookWaits = pgTable(
  "luzo_webhook_waits",
  {
    id: text("id").primaryKey(),
    executionId: text("execution_id").notNull(),
    stepId: text("step_id").notNull(),
    endpointId: text("endpoint_id").notNull(),
    correlationKey: text("correlation_key").notNull(),
    correlationSource: text("correlation_source").notNull(),
    correlationField: text("correlation_field").notNull(),
    status: text("status").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    matchedEventId: text("matched_event_id"),
    verificationMode: text("verification_mode").notNull(),
    verificationSecret: text("verification_secret"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    endpointStatusCorrelationIdx: index("luzo_webhook_waits_endpoint_status_corr_idx").on(
      table.endpointId,
      table.status,
      table.correlationKey,
    ),
    matchedEventIdx: index("luzo_webhook_waits_matched_event_idx").on(table.matchedEventId),
  }),
);

export const webhookEvents = pgTable(
  "luzo_webhook_events",
  {
    id: text("id").primaryKey(),
    endpointId: text("endpoint_id").notNull(),
    deliveryId: text("delivery_id"),
    correlationKey: text("correlation_key"),
    headersRedacted: jsonb("headers_redacted").notNull(),
    payload: jsonb("payload").notNull(),
    signatureStatus: text("signature_status").notNull(),
    matchedWaitId: text("matched_wait_id"),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
  },
  (table) => ({
    endpointDeliveryIdx: uniqueIndex("luzo_webhook_events_endpoint_delivery_idx").on(
      table.endpointId,
      table.deliveryId,
    ),
    matchedWaitIdx: index("luzo_webhook_events_matched_wait_idx").on(table.matchedWaitId),
  }),
);

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

CREATE TABLE IF NOT EXISTS luzo_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  complexity TEXT NOT NULL DEFAULT 'starter',
  source_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS luzo_webhook_waits (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  correlation_key TEXT NOT NULL,
  correlation_source TEXT NOT NULL,
  correlation_field TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  matched_event_id TEXT,
  verification_mode TEXT NOT NULL,
  verification_secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS luzo_webhook_events (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  delivery_id TEXT,
  correlation_key TEXT,
  headers_redacted JSONB NOT NULL,
  payload JSONB NOT NULL,
  signature_status TEXT NOT NULL,
  matched_wait_id TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS luzo_webhook_waits_endpoint_status_corr_idx
  ON luzo_webhook_waits(endpoint_id, status, correlation_key);
CREATE INDEX IF NOT EXISTS luzo_webhook_waits_matched_event_idx
  ON luzo_webhook_waits(matched_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS luzo_webhook_events_endpoint_delivery_idx
  ON luzo_webhook_events(endpoint_id, delivery_id);
CREATE INDEX IF NOT EXISTS luzo_webhook_events_matched_wait_idx
  ON luzo_webhook_events(matched_wait_id);
`;
