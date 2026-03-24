import type postgres from "postgres";

interface ExpectedColumn {
  name: string;
  dataType: string;
  addSql: string;
}

export interface RuntimeColumnStatus {
  expectedType: string;
  actualType: string | null;
  exists: boolean;
  matches: boolean;
}

export interface RuntimeTableStatus {
  name: string;
  exists: boolean;
  created: boolean;
  addedColumns: string[];
  columns: Record<string, RuntimeColumnStatus>;
  warnings: string[];
}

export interface RuntimeSchemaStatus {
  schemaReady: boolean;
  warnings: string[];
  tables: RuntimeTableStatus[];
}

const TABLES = [
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
    ] satisfies ExpectedColumn[],
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
      {
        name: "name",
        dataType: "text",
        addSql: "ALTER TABLE luzo_requests ADD COLUMN name TEXT",
      },
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
    ] satisfies ExpectedColumn[],
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
      {
        name: "name",
        dataType: "text",
        addSql: "ALTER TABLE luzo_pipelines ADD COLUMN name TEXT",
      },
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
    ] satisfies ExpectedColumn[],
  },
] as const;

export async function ensureRuntimeSchema(
  sql: ReturnType<typeof postgres>,
): Promise<RuntimeSchemaStatus> {
  const tables = await Promise.all(TABLES.map((table) => ensureTable(sql, table)));
  const warnings = tables.flatMap((table) => table.warnings);
  return { schemaReady: warnings.length === 0, warnings, tables };
}

async function ensureTable(
  sql: ReturnType<typeof postgres>,
  table: (typeof TABLES)[number],
): Promise<RuntimeTableStatus> {
  const exists = await hasTable(sql, table.name);
  if (!exists) {
    await sql.unsafe(table.createSql);
  }

  const actualColumns = await getColumns(sql, table.name);
  const addedColumns: string[] = [];
  const warnings: string[] = [];
  const columns = Object.fromEntries(
    table.columns.map((column) => {
      const actualType = actualColumns.get(column.name) ?? null;
      const existsAfterCreate = actualType != null;
      const matches = actualType == null || normalizeType(actualType) === column.dataType;
      return [
        column.name,
        { expectedType: column.dataType, actualType, exists: existsAfterCreate, matches },
      ];
    }),
  ) as RuntimeTableStatus["columns"];

  for (const column of table.columns) {
    const actualType = actualColumns.get(column.name);
    if (!actualType) {
      await sql.unsafe(column.addSql);
      addedColumns.push(column.name);
      columns[column.name] = {
        expectedType: column.dataType,
        actualType: column.dataType,
        exists: true,
        matches: true,
      };
      continue;
    }

    if (normalizeType(actualType) !== column.dataType) {
      warnings.push(
        `${table.name}.${column.name} expected ${column.dataType} but found ${actualType}. Review this column manually.`,
      );
      columns[column.name] = {
        expectedType: column.dataType,
        actualType,
        exists: true,
        matches: false,
      };
    }
  }

  return { name: table.name, exists, created: !exists, addedColumns, columns, warnings };
}

async function hasTable(sql: ReturnType<typeof postgres>, tableName: string) {
  const result = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;
  return result[0]?.exists ?? false;
}

async function getColumns(sql: ReturnType<typeof postgres>, tableName: string) {
  const rows = await sql<{ column_name: string; data_type: string; udt_name: string }[]>`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `;
  return new Map(
    rows.map((row) => [
      row.column_name,
      row.data_type === "USER-DEFINED" ? row.udt_name : row.data_type,
    ]),
  );
}

function normalizeType(type: string) {
  return type.toLowerCase();
}
