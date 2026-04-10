import type { CSSProperties, ReactNode } from "react";

export function CardLayout({
  accent,
  children,
  eyebrow,
  meta,
  title,
}: {
  accent: string;
  children: ReactNode;
  eyebrow: string;
  meta?: string;
  title: string;
}) {
  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <div
        style={{
          alignItems: "flex-start",
          display: "grid",
          gap: 10,
          gridTemplateColumns: "6px minmax(0, 1fr)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 50%, transparent))`,
            borderRadius: 999,
            boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 24%, transparent)`,
            minHeight: 58,
          }}
        />
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <div
            style={{
              alignItems: "center",
              color: "var(--fb-text-secondary, #475569)",
              display: "flex",
              fontSize: 10,
              gap: 8,
              letterSpacing: "0.14em",
              minWidth: 0,
              textTransform: "uppercase",
            }}
          >
            <span>{eyebrow}</span>
            {meta ? <MetaText>{meta}</MetaText> : null}
          </div>
          <div style={titleStyle}>{title}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function RowSummary({ items }: { items: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
      {items.map((item) => (
        <div key={item} style={chipStyle}>
          {item}
        </div>
      ))}
    </div>
  );
}

export function SplitSummary({ leading, trailing }: { leading: ReactNode; trailing: ReactNode }) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        gap: 12,
        justifyContent: "space-between",
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>{leading}</div>
      <div style={{ minWidth: 0 }}>{trailing}</div>
    </div>
  );
}

export function PreviewBox({ children, mono }: { children: ReactNode; mono?: boolean }) {
  return (
    <div
      style={{
        background: "var(--fb-node-section-bg, rgba(148, 163, 184, 0.08))",
        border: "1px solid var(--fb-node-section-border, rgba(148, 163, 184, 0.18))",
        borderRadius: 14,
        color: "var(--fb-text-primary, #0f172a)",
        fontFamily: mono
          ? "var(--fb-font-mono, ui-monospace, monospace)"
          : "var(--fb-font-sans, system-ui, sans-serif)",
        fontSize: 12,
        lineHeight: 1.45,
        padding: "10px 12px",
      }}
    >
      {children}
    </div>
  );
}

export function HintText({ children }: { children: ReactNode }) {
  return <div style={{ color: "var(--fb-text-secondary, #475569)", fontSize: 12 }}>{children}</div>;
}

export function RouteBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "danger" | "neutral" | "success";
}) {
  const styles = {
    danger: { background: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.24)" },
    neutral: { background: "rgba(148, 163, 184, 0.12)", borderColor: "rgba(148, 163, 184, 0.24)" },
    success: { background: "rgba(34, 197, 94, 0.12)", borderColor: "rgba(34, 197, 94, 0.24)" },
  }[tone];

  return (
    <span
      style={{
        ...chipStyle,
        background: styles.background,
        borderColor: styles.borderColor,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        ...chipStyle,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export function UrlText({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: "var(--fb-text-primary, #0f172a)",
        flex: 1,
        fontFamily: "var(--fb-font-mono, ui-monospace, monospace)",
        fontSize: 12,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

export function MiniBars() {
  return (
    <div style={{ alignItems: "end", display: "flex", gap: 6, height: 54 }}>
      {[18, 34, 22, 44, 28].map((height, index) => (
        <div
          key={`${height}-${index}`}
          style={{
            background: "var(--fb-node-accent-display, #0f766e)",
            borderRadius: "999px 999px 4px 4px",
            height,
            opacity: 0.85 - index * 0.08,
            width: 18,
          }}
        />
      ))}
    </div>
  );
}

function MetaText({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        letterSpacing: "normal",
        minWidth: 0,
        opacity: 0.85,
        overflow: "hidden",
        textOverflow: "ellipsis",
        textTransform: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const titleStyle: CSSProperties = {
  color: "var(--fb-text-primary, #0f172a)",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.35,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const chipStyle: CSSProperties = {
  background: "var(--fb-node-chip-bg, rgba(15, 23, 42, 0.04))",
  border: "1px solid var(--fb-node-chip-border, rgba(148, 163, 184, 0.16))",
  borderRadius: 999,
  color: "var(--fb-text-secondary, #475569)",
  fontSize: 11,
  lineHeight: 1,
  maxWidth: "100%",
  overflow: "hidden",
  padding: "7px 10px",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
