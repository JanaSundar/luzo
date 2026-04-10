import type { RuntimeTableDefinition } from "./schema-init-types";

export const CORE_RUNTIME_TABLES: RuntimeTableDefinition[] = [
  {
    name: "luzo_collections",
    createSql: `
      CREATE TABLE luzo_collections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    columns: [
      { name: "id", dataType: "text", addSql: "ALTER TABLE luzo_collections ADD COLUMN id TEXT" },
      {
        name: "name",
        dataType: "text",
        addSql: "ALTER TABLE luzo_collections ADD COLUMN name TEXT",
      },
      {
        name: "description",
        dataType: "text",
        addSql: "ALTER TABLE luzo_collections ADD COLUMN description TEXT",
      },
      {
        name: "created_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_collections ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
      {
        name: "updated_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_collections ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
    ],
  },
  {
    name: "luzo_requests",
    createSql: `
      CREATE TABLE luzo_requests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        collection_id TEXT REFERENCES luzo_collections(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    columns: [
      { name: "id", dataType: "text", addSql: "ALTER TABLE luzo_requests ADD COLUMN id TEXT" },
      { name: "name", dataType: "text", addSql: "ALTER TABLE luzo_requests ADD COLUMN name TEXT" },
      {
        name: "collection_id",
        dataType: "text",
        addSql:
          "ALTER TABLE luzo_requests ADD COLUMN collection_id TEXT REFERENCES luzo_collections(id) ON DELETE CASCADE",
      },
      {
        name: "data",
        dataType: "jsonb",
        addSql: "ALTER TABLE luzo_requests ADD COLUMN data JSONB",
      },
      {
        name: "created_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_requests ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
      {
        name: "updated_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_requests ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
    ],
  },
  {
    name: "luzo_pipelines",
    createSql: `
      CREATE TABLE luzo_pipelines (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `,
    columns: [
      { name: "id", dataType: "text", addSql: "ALTER TABLE luzo_pipelines ADD COLUMN id TEXT" },
      { name: "name", dataType: "text", addSql: "ALTER TABLE luzo_pipelines ADD COLUMN name TEXT" },
      {
        name: "data",
        dataType: "jsonb",
        addSql: "ALTER TABLE luzo_pipelines ADD COLUMN data JSONB",
      },
      {
        name: "created_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_pipelines ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
      {
        name: "updated_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_pipelines ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
    ],
  },
  {
    name: "luzo_templates",
    createSql: `
      CREATE TABLE luzo_templates (
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
      )
    `,
    columns: [
      { name: "id", dataType: "text", addSql: "ALTER TABLE luzo_templates ADD COLUMN id TEXT" },
      { name: "name", dataType: "text", addSql: "ALTER TABLE luzo_templates ADD COLUMN name TEXT" },
      {
        name: "description",
        dataType: "text",
        addSql: "ALTER TABLE luzo_templates ADD COLUMN description TEXT",
      },
      {
        name: "category",
        dataType: "text",
        addSql: "ALTER TABLE luzo_templates ADD COLUMN category TEXT",
      },
      {
        name: "tags",
        dataType: "jsonb",
        addSql: "ALTER TABLE luzo_templates ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb",
      },
      {
        name: "complexity",
        dataType: "text",
        addSql: "ALTER TABLE luzo_templates ADD COLUMN complexity TEXT NOT NULL DEFAULT 'starter'",
      },
      {
        name: "source_type",
        dataType: "text",
        addSql: "ALTER TABLE luzo_templates ADD COLUMN source_type TEXT",
      },
      {
        name: "data",
        dataType: "jsonb",
        addSql: "ALTER TABLE luzo_templates ADD COLUMN data JSONB",
      },
      {
        name: "created_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_templates ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
      {
        name: "updated_at",
        dataType: "timestamp with time zone",
        addSql:
          "ALTER TABLE luzo_templates ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      },
    ],
  },
];
