const INDENT = "  ";

export interface JsonNodeMeta {
  path: string;
  startLine: number;
  endLine: number;
  summary: string;
}

export interface JsonLineMeta {
  lineNumber: number;
  text: string;
  path: string;
  key?: string;
  ancestors: string[];
  foldPath?: string;
  searchText: string;
}

export interface JsonDocumentModel {
  formattedText: string;
  lines: JsonLineMeta[];
  nodes: Record<string, JsonNodeMeta>;
}

export function tryBuildJsonDocument(text: string): JsonDocumentModel | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    const lines: JsonLineMeta[] = [];
    const nodes: Record<string, JsonNodeMeta> = {};
    renderJsonValue(parsed, {
      path: "$",
      key: undefined,
      depth: 0,
      isLast: true,
      ancestors: [],
      lines,
      nodes,
    });

    return {
      formattedText: lines.map((line) => line.text).join("\n"),
      lines,
      nodes,
    };
  } catch {
    return null;
  }
}

function renderJsonValue(
  value: unknown,
  context: {
    path: string;
    key?: string;
    depth: number;
    isLast: boolean;
    ancestors: string[];
    lines: JsonLineMeta[];
    nodes: Record<string, JsonNodeMeta>;
  },
) {
  const { path, key, depth, isLast, ancestors, lines, nodes } = context;
  const prefix = `${INDENT.repeat(depth)}${key == null ? "" : `${JSON.stringify(key)}: `}`;
  const suffix = isLast ? "" : ",";

  if (Array.isArray(value)) {
    const startLine = lines.length + 1;
    if (value.length === 0) {
      pushLine(lines, `${prefix}[]${suffix}`, path, key, ancestors);
      return;
    }

    pushLine(lines, `${prefix}[`, path, key, ancestors, path);
    const nodeAncestors = [...ancestors, path];
    value.forEach((item, index) =>
      renderJsonValue(item, {
        path: `${path}[${index}]`,
        depth: depth + 1,
        isLast: index === value.length - 1,
        ancestors: nodeAncestors,
        lines,
        nodes,
      }),
    );
    pushLine(lines, `${INDENT.repeat(depth)}]${suffix}`, path, key, ancestors);
    nodes[path] = {
      path,
      startLine,
      endLine: lines.length,
      summary: `${prefix}[${value.length} item${value.length === 1 ? "" : "s"}]${suffix}`,
    };
    return;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const startLine = lines.length + 1;
    if (entries.length === 0) {
      pushLine(lines, `${prefix}{}${suffix}`, path, key, ancestors);
      return;
    }

    pushLine(lines, `${prefix}{`, path, key, ancestors, path);
    const nodeAncestors = [...ancestors, path];
    entries.forEach(([childKey, childValue], index) =>
      renderJsonValue(childValue, {
        path: `${path}.${childKey}`,
        key: childKey,
        depth: depth + 1,
        isLast: index === entries.length - 1,
        ancestors: nodeAncestors,
        lines,
        nodes,
      }),
    );
    pushLine(lines, `${INDENT.repeat(depth)}}${suffix}`, path, key, ancestors);
    nodes[path] = {
      path,
      startLine,
      endLine: lines.length,
      summary: `${prefix}{${entries.length} key${entries.length === 1 ? "" : "s"}}${suffix}`,
    };
    return;
  }

  pushLine(lines, `${prefix}${stringifyJsonValue(value)}${suffix}`, path, key, ancestors);
}

function pushLine(
  lines: JsonLineMeta[],
  text: string,
  path: string,
  key: string | undefined,
  ancestors: string[],
  foldPath?: string,
) {
  lines.push({
    lineNumber: lines.length + 1,
    text,
    path,
    key,
    ancestors,
    foldPath,
    searchText: [path, key, text].filter(Boolean).join(" "),
  });
}

function stringifyJsonValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "null";
  return JSON.stringify(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
