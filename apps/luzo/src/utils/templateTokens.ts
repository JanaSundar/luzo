import { VARIABLE_REGEX } from "@/utils/variables";

export const TEMPLATE_TRIGGER = "{{";
export const TEMPLATE_CLOSE = "}}";

export interface TemplateSegment {
  type: "text" | "variable";
  value: string;
  path?: string;
}

export function getActiveTemplateToken(
  value: string,
  cursorPos: number,
): { token: string; start: number } | null {
  const textBefore = value.slice(0, cursorPos);
  const triggerIdx = textBefore.lastIndexOf(TEMPLATE_TRIGGER);
  if (triggerIdx === -1) return null;

  const between = textBefore.slice(triggerIdx + TEMPLATE_TRIGGER.length);
  if (between.includes("}")) return null;
  if (between.includes("\n")) return null;

  return { token: between, start: triggerIdx };
}

export function applyTemplateSelection(value: string, cursorPos: number, selected: string): string {
  const active = getActiveTemplateToken(value, cursorPos);
  if (!active) return value;

  const before = value.slice(0, active.start);
  const after = value.slice(cursorPos);
  return `${before}${TEMPLATE_TRIGGER}${selected}${TEMPLATE_CLOSE}${after}`;
}

export function parseTemplateSegments(value: string): TemplateSegment[] {
  if (!value) return [{ type: "text", value: "" }];

  const segments: TemplateSegment[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(VARIABLE_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", value: value.slice(lastIndex, start) });
    }

    const path = match[1]?.trim() ?? "";
    segments.push({ type: "variable", value: match[0], path });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({ type: "text", value: value.slice(lastIndex) });
  }

  return segments;
}

export function getVariableAtRange(value: string, from: number, to: number): string | null {
  for (const match of value.matchAll(VARIABLE_REGEX)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (from >= start && to <= end) {
      return match[1]?.trim() ?? null;
    }
  }

  return null;
}
