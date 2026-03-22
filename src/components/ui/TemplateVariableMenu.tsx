"use client";

import type { UseComboboxReturnValue } from "downshift";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

type TemplateCombobox = UseComboboxReturnValue<VariableSuggestion>;

export function TemplateVariableMenu({
  items,
  highlightedIndex,
  getItemProps,
  getMenuProps,
  isOpen,
  style,
}: {
  items: VariableSuggestion[];
  highlightedIndex: number;
  getItemProps: TemplateCombobox["getItemProps"];
  getMenuProps: TemplateCombobox["getMenuProps"];
  isOpen: boolean;
  style: CSSProperties;
}) {
  const groups = groupSuggestions(items);

  return (
    <div
      {...getMenuProps({}, { suppressRefError: true })}
      style={style}
      className={cn(
        "min-w-[240px] max-w-sm overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl",
        "max-h-64 overflow-y-auto",
        (!isOpen || items.length === 0) && "hidden",
      )}
    >
      {isOpen ? (
        <div className="p-1">
          {groups.map((group) => (
            <div key={group.stepId}>
              {group.label ? (
                <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </div>
              ) : null}
              {group.items.map((item) => {
                const index = items.indexOf(item);
                return (
                  <div
                    key={item.path}
                    {...getItemProps({ item, index })}
                    className={cn(
                      "cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors",
                      highlightedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <span className="block font-mono text-[11px] leading-tight">{item.path}</span>
                    <span className="block text-[10px] leading-tight text-muted-foreground">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupSuggestions(items: VariableSuggestion[]) {
  const groups = new Map<string, VariableSuggestion[]>();
  for (const item of items) {
    const key = item.stepId || "__env__";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([stepId, groupItems]) => ({
    stepId,
    label: stepId === "__env__" ? "Environment" : stepId,
    items: groupItems,
  }));
}
