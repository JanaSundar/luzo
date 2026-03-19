/**
 * Renders markdown AST to React-PDF components.
 * Matches website highlighting: headers, bold, italic, code, lists, tables, blockquotes.
 */

import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BlockContent, PhrasingContent, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { sanitizeForPdf } from "@/lib/utils/pdf-sanitize";

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

const pdfStyles = StyleSheet.create({
  h1: {
    fontSize: 18,
    fontWeight: 700,
    marginTop: space.lg,
    marginBottom: space.md,
    color: "#111827",
    fontFamily: "Inter",
  },
  h2: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: space.lg,
    marginBottom: space.sm,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    color: "#111827",
    fontFamily: "Inter",
  },
  h3: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: space.md,
    marginBottom: space.sm,
    color: "#111827",
    fontFamily: "Inter",
  },
  h4: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: space.md,
    marginBottom: space.xs,
    color: "#111827",
    fontFamily: "Inter",
  },
  p: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: space.md,
    color: "#111827",
    fontFamily: "Inter",
  },
  ul: { marginBottom: space.md, marginLeft: space.lg },
  ol: { marginBottom: space.md, marginLeft: space.lg },
  li: { fontSize: 10, lineHeight: 1.5, marginBottom: space.xs, fontFamily: "Inter" },
  code: {
    fontSize: 9,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: "Helvetica",
  },
  pre: {
    fontSize: 9,
    backgroundColor: "#f3f4f6",
    padding: space.md,
    marginBottom: space.md,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: "#111827",
    backgroundColor: "#f9fafb",
    paddingVertical: space.sm,
    paddingLeft: space.lg,
    marginBottom: space.md,
  },
  hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: space.md },
  table: { marginBottom: space.md, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    padding: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableHeaderCell: { fontSize: 8, fontWeight: 700, color: "#6b7280", flex: 1 },
  tableCell: { fontSize: 9, flex: 1, color: "#111827" },
});

function parseMarkdown(md: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(md) as Root;
}

function renderPhrasing(node: PhrasingContent, key: number | string): React.ReactNode {
  switch (node.type) {
    case "text":
      return sanitizeForPdf(node.value);
    case "strong":
      return (
        <Text key={key} style={{ fontWeight: 700 }}>
          {(node.children as PhrasingContent[]).map((c, i) => renderPhrasing(c, i))}
        </Text>
      );
    case "emphasis":
      return (
        <Text key={key} style={{ fontStyle: "italic", color: "#6b7280" }}>
          {(node.children as PhrasingContent[]).map((c, i) => renderPhrasing(c, i))}
        </Text>
      );
    case "inlineCode":
      return (
        <Text key={key} style={pdfStyles.code}>
          {sanitizeForPdf(node.value)}
        </Text>
      );
    case "link":
      return (
        <Text key={key} style={{ color: "#2563eb" }}>
          {(node.children as PhrasingContent[]).map((c, i) => renderPhrasing(c, i))}
        </Text>
      );
    case "delete":
      return (
        <Text key={key} style={{ textDecoration: "line-through" }}>
          {(node.children as PhrasingContent[]).map((c, i) => renderPhrasing(c, i))}
        </Text>
      );
    default:
      if ("children" in node) {
        return (node.children as PhrasingContent[]).map((c, i) => renderPhrasing(c, i));
      }
      return null;
  }
}

function renderBlock(node: BlockContent, key: number | string, isFirst: boolean): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const baseStyle = pdfStyles[`h${node.depth}` as keyof typeof pdfStyles] ?? pdfStyles.h3;
      const style = isFirst ? [baseStyle, { marginTop: 0 }] : baseStyle;
      return (
        <Text key={key} style={style}>
          {node.children.map((c, i) => renderPhrasing(c as PhrasingContent, i))}
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text key={key} style={pdfStyles.p}>
          {node.children.map((c, i) => renderPhrasing(c as PhrasingContent, i))}
        </Text>
      );
    case "list": {
      const style = node.ordered ? pdfStyles.ol : pdfStyles.ul;
      return (
        <View key={key} style={style}>
          {node.children.map((item, i) => {
            if (item.type !== "listItem") return null;
            const firstChild = item.children[0];
            const content =
              firstChild?.type === "paragraph"
                ? (firstChild.children as PhrasingContent[]).map((c, j) => renderPhrasing(c, j))
                : item.children.map((c, j) => renderBlock(c as BlockContent, j, false));
            const bullet = node.ordered ? `${i + 1}. ` : "• ";
            return (
              <Text key={i} style={pdfStyles.li}>
                {bullet}
                {content}
              </Text>
            );
          })}
        </View>
      );
    }
    case "code":
      return (
        <View key={key} style={pdfStyles.pre}>
          <Text style={{ fontFamily: "Helvetica" }}>{sanitizeForPdf(node.value)}</Text>
        </View>
      );
    case "blockquote":
      return (
        <View key={key} style={pdfStyles.blockquote}>
          {node.children.map((c, i) => renderBlock(c as BlockContent, i, false))}
        </View>
      );
    case "thematicBreak":
      return <View key={key} style={pdfStyles.hr} />;
    case "table": {
      const rows = node.children;
      const headerRow = rows[0];
      const bodyRows = rows.slice(1);
      return (
        <View key={key} style={pdfStyles.table}>
          {headerRow?.type === "tableRow" && (
            <View style={pdfStyles.tableHeader}>
              {headerRow.children.map((cell, i) => {
                if (cell.type !== "tableCell") return null;
                const text = (cell.children as PhrasingContent[]).map((c, j) =>
                  renderPhrasing(c, j)
                );
                return (
                  <Text key={i} style={[pdfStyles.tableHeaderCell, { flex: 1 }]}>
                    {text}
                  </Text>
                );
              })}
            </View>
          )}
          {bodyRows.map((row, ri) => {
            if (row.type !== "tableRow") return null;
            return (
              <View key={ri} style={pdfStyles.tableRow}>
                {row.children.map((cell, ci) => {
                  if (cell.type !== "tableCell") return null;
                  const text = (cell.children as PhrasingContent[]).map((c, j) =>
                    renderPhrasing(c, j)
                  );
                  return (
                    <Text key={ci} style={pdfStyles.tableCell}>
                      {text}
                    </Text>
                  );
                })}
              </View>
            );
          })}
        </View>
      );
    }
    default:
      if ("children" in node) {
        return (node.children as BlockContent[]).map((c, i) => renderBlock(c, i, false));
      }
      return null;
  }
}

export function renderMarkdownToPdf(markdown: string): React.ReactNode[] {
  const root = parseMarkdown(markdown);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < root.children.length; i++) {
    const node = root.children[i] as BlockContent;
    const el = renderBlock(node, i, i === 0);
    if (el != null) nodes.push(el);
  }
  return nodes;
}
