import type { RuntimeTableDefinition } from "./schema-init-types";

export const WEBHOOK_RUNTIME_TABLES: RuntimeTableDefinition[] = [
  {
    name: "luzo_webhook_waits",
    createSql: `
      CREATE TABLE luzo_webhook_waits (
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
      )
    `,
    columns: [
      { name: "id", dataType: "text", addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN id TEXT" },
      {
        name: "execution_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN execution_id TEXT",
      },
      {
        name: "step_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN step_id TEXT",
      },
      {
        name: "endpoint_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN endpoint_id TEXT",
      },
      {
        name: "correlation_key",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN correlation_key TEXT",
      },
      {
        name: "correlation_source",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN correlation_source TEXT",
      },
      {
        name: "correlation_field",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN correlation_field TEXT",
      },
      {
        name: "status",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN status TEXT",
      },
      {
        name: "expires_at",
        dataType: "timestamp with time zone",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN expires_at TIMESTAMPTZ",
      },
      {
        name: "matched_event_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN matched_event_id TEXT",
      },
      {
        name: "verification_mode",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN verification_mode TEXT",
      },
      {
        name: "verification_secret",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_waits ADD COLUMN verification_secret TEXT",
      },
      {
        name: "created_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_webhook_waits ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
      {
        name: "updated_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_webhook_waits ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
    ],
  },
  {
    name: "luzo_webhook_events",
    createSql: `
      CREATE TABLE luzo_webhook_events (
        id TEXT PRIMARY KEY,
        endpoint_id TEXT NOT NULL,
        delivery_id TEXT,
        correlation_key TEXT,
        headers_redacted JSONB NOT NULL,
        payload JSONB NOT NULL,
        signature_status TEXT NOT NULL,
        matched_wait_id TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    columns: [
      {
        name: "id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_events ADD COLUMN id TEXT",
      },
      {
        name: "endpoint_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_events ADD COLUMN endpoint_id TEXT",
      },
      {
        name: "delivery_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_events ADD COLUMN delivery_id TEXT",
      },
      {
        name: "correlation_key",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_events ADD COLUMN correlation_key TEXT",
      },
      {
        name: "headers_redacted",
        dataType: "jsonb",
        addSql:
          "ALTER TABLE luzo_webhook_events ADD COLUMN headers_redacted JSONB NOT NULL DEFAULT '{}'::jsonb",
      },
      {
        name: "payload",
        dataType: "jsonb",
        addSql:
          "ALTER TABLE luzo_webhook_events ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb",
      },
      {
        name: "signature_status",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_events ADD COLUMN signature_status TEXT",
      },
      {
        name: "matched_wait_id",
        dataType: "text",
        addSql: "ALTER TABLE luzo_webhook_events ADD COLUMN matched_wait_id TEXT",
      },
      {
        name: "received_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_webhook_events ADD COLUMN received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
    ],
  },
];

export const WEBHOOK_INDEX_SQL = [
  "CREATE INDEX IF NOT EXISTS luzo_webhook_waits_endpoint_status_corr_idx ON luzo_webhook_waits(endpoint_id, status, correlation_key)",
  "CREATE INDEX IF NOT EXISTS luzo_webhook_waits_matched_event_idx ON luzo_webhook_waits(matched_event_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS luzo_webhook_events_endpoint_delivery_idx ON luzo_webhook_events(endpoint_id, delivery_id)",
  "CREATE INDEX IF NOT EXISTS luzo_webhook_events_matched_wait_idx ON luzo_webhook_events(matched_wait_id)",
] as const;
