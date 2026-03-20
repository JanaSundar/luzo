"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

type TokenType = "key" | "string" | "number" | "boolean" | "null" | "punctuation" | "whitespace";

interface Token {
  id: number;
  type: TokenType;
  value: string;
}

/** High-contrast palette with separate light/dark colors for readability */
const TOKEN_CLASSES: Record<TokenType, string> = {
  key: "text-[#1a237e] dark:text-[#82b1ff]", // deep navy / bright blue
  string: "text-[#1b5e20] dark:text-[#c3e88d]", // dark green / soft neon green
  number: "text-[#e65100] dark:text-[#ffcb6b]", // deep orange / warm yellow-orange
  boolean: "text-[#4a148c] dark:text-[#c792ea]", // deep purple / bright purple
  null: "text-[#263238] dark:text-[#89ddff]", // blue-gray / cyan
  punctuation: "text-[#455a64] dark:text-[#cfd8dc]", // gray / light gray
  whitespace: "",
};

function tokenize(json: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let idCounter = 0;

  const peek = () => json[i];
  const advance = () => json[i++];
  const readWhitespace = (): string => {
    let s = "";
    while (i < json.length && /[\s\n\r\t]/.test(json[i])) s += advance();
    return s;
  };
  const peekPastWhitespace = () => {
    let j = i;
    while (j < json.length && /[\s\n\r]/.test(json[j])) j++;
    return json[j];
  };

  const readString = (): string => {
    const quote = advance();
    let s = quote;
    while (i < json.length) {
      const c = advance();
      if (c === "\\" && i < json.length) {
        s += c + advance();
      } else if (c === quote) {
        s += c;
        break;
      } else {
        s += c;
      }
    }
    return s;
  };

  const readNumber = (): string => {
    let s = "";
    while (i < json.length && /[-+0-9eE.]/.test(json[i])) s += advance();
    return s;
  };

  const readWord = (): string => {
    let s = "";
    while (i < json.length && /[a-zA-Z]/.test(json[i])) s += advance();
    return s;
  };

  while (i < json.length) {
    const c = peek();
    if (!c) break;

    if (/[\s\n\r\t]/.test(c)) {
      const ws = readWhitespace();
      if (ws) tokens.push({ id: idCounter++, type: "whitespace", value: ws });
      continue;
    }

    if (c === '"') {
      const full = readString();
      const next = peekPastWhitespace();
      const isKey = next === ":";
      tokens.push({ id: idCounter++, type: isKey ? "key" : "string", value: full });
      continue;
    }

    if (/[-0-9]/.test(c)) {
      tokens.push({ id: idCounter++, type: "number", value: readNumber() });
      continue;
    }

    if (/[tf]/.test(c)) {
      tokens.push({ id: idCounter++, type: "boolean", value: readWord() });
      continue;
    }

    if (c === "n") {
      tokens.push({ id: idCounter++, type: "null", value: readWord() });
      continue;
    }

    if (/[{}[\]:,]/.test(c)) {
      advance();
      tokens.push({ id: idCounter++, type: "punctuation", value: c });
      continue;
    }

    advance();
    tokens.push({ id: idCounter++, type: "punctuation", value: c });
  }

  return tokens;
}

function highlightText(text: string, search: string): ReactNode[] {
  if (!search.trim()) return [text];
  const parts = text.split(new RegExp(`(${escapeRegex(search)})`, "gi"));
  let idCounter = 0;
  const segments = parts.map((part) => ({ part, id: idCounter++ }));
  return segments.map(({ part, id }) =>
    part.toLowerCase() === search.toLowerCase() ? (
      <mark
        key={id}
        className="bg-amber-300 text-amber-950 dark:bg-amber-500 dark:text-amber-950 rounded px-0.5 font-medium"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface JsonLineData {
  tokens: Token[];
  id: number;
}

export function useJsonLines(text: string): JsonLineData[] {
  return useMemo(() => {
    try {
      JSON.parse(text);
      const allTokens = tokenize(text);
      const lines: JsonLineData[] = [];
      let currentLineTokens: Token[] = [];
      let lineId = 0;

      for (const token of allTokens) {
        if (token.type === "whitespace" && token.value.includes("\n")) {
          const parts = token.value.split("\n");
          for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
              lines.push({ tokens: currentLineTokens, id: lineId++ });
              currentLineTokens = [];
            }
            if (parts[i]) {
              currentLineTokens.push({ ...token, id: lineId * 1000 + i, value: parts[i] });
            }
          }
        } else {
          currentLineTokens.push(token);
        }
      }
      if (currentLineTokens.length > 0) {
        lines.push({ tokens: currentLineTokens, id: lineId++ });
      }
      return lines;
    } catch {
      return text.split("\n").map((line, i) => ({
        id: i,
        tokens: [{ id: i, type: "whitespace", value: line }],
      }));
    }
  }, [text]);
}

export function JsonLine({
  line,
  highlight,
  style,
}: {
  line: JsonLineData;
  highlight?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className="min-w-0 max-w-full whitespace-pre-wrap break-words font-mono text-xs leading-relaxed"
    >
      {line.tokens.map((t) => (
        <span key={t.id} className={TOKEN_CLASSES[t.type] || ""}>
          {highlight ? highlightText(t.value, highlight) : t.value}
        </span>
      ))}
    </div>
  );
}

export function JsonColorized({ text, highlight }: { text: string; highlight?: string }) {
  const lines = useJsonLines(text);

  return (
    <code className="block min-w-0 max-w-full whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
      {lines.map((line) => (
        <JsonLine key={line.id} line={line} highlight={highlight} />
      ))}
    </code>
  );
}
