"use client";

import type { UseComboboxReturnValue } from "downshift";
import { AnimatePresence, motion } from "motion/react";
import type { TemplateMenuPosition } from "@/lib/utils/templateMenuPosition";
import { presentTemplateSuggestion } from "@/lib/utils/templateSuggestionPresentation";
import { cn } from "@/lib/utils";
import type { VariableSuggestion } from "@/types/pipeline-debug";

type TemplateCombobox = UseComboboxReturnValue<VariableSuggestion>;

export function TemplateVariableMenu({
  items,
  highlightedIndex,
  getItemProps,
  getMenuProps,
  isOpen,
  position,
}: {
  items: VariableSuggestion[];
  highlightedIndex: number;
  getItemProps: TemplateCombobox["getItemProps"];
  getMenuProps: TemplateCombobox["getMenuProps"];
  isOpen: boolean;
  position: TemplateMenuPosition;
}) {
  const groups = groupSuggestions(items);
  const itemIndexByPath = new Map(
    items.map((item, index) => [`${item.stepId}:${item.path}`, index]),
  );
  const menuProps = getMenuProps({}, { suppressRefError: true });

  return (
    <div
      {...menuProps}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: position.zIndex }}
      aria-hidden={!isOpen || items.length === 0}
    >
      <AnimatePresence>
        {isOpen && items.length > 0 ? (
          <motion.div
            style={{
              left: position.left,
              maxHeight: position.maxHeight,
              position: position.position,
              top: position.top,
              width: position.width,
              zIndex: position.zIndex,
              maxWidth: position.maxWidth,
              pointerEvents: "auto",
            }}
            initial={{
              opacity: 0,
              scale: 0.97,
              y: -4,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.98,
              y: -4,
            }}
            transition={{
              opacity: { duration: 0.14, ease: "easeOut" },
              scale: { duration: 0.16, ease: "easeOut" },
              y: { duration: 0.16, ease: "easeOut" },
            }}
            className={cn(
              "min-w-[240px] max-w-sm overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl",
              "overflow-y-auto",
            )}
          >
            <div className="p-1">
              {groups.map((group) => (
                <div key={group.stepId}>
                  {group.label ? (
                    <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      {group.label}
                    </div>
                  ) : null}
                  {group.items.map((item) => {
                    const index = itemIndexByPath.get(`${item.stepId}:${item.path}`) ?? -1;
                    const presented = presentTemplateSuggestion(item);
                    return (
                      <div
                        key={`${group.stepId}:${item.path}`}
                        {...getItemProps({ item, index })}
                        className={cn(
                          "cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors",
                          highlightedIndex === index
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="block font-mono text-[11px] leading-tight">
                            {presented.alias ?? item.path}
                          </span>
                          {presented.requestName ? (
                            <span className="truncate text-[10px] leading-tight text-muted-foreground">
                              {presented.requestName}
                            </span>
                          ) : null}
                        </div>
                        <span className="block text-[10px] leading-tight text-muted-foreground">
                          {presented.detail}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function groupSuggestions(items: VariableSuggestion[]) {
  const groups = new Map<string, Map<string, VariableSuggestion>>();
  for (const item of items) {
    const key = item.stepId || "__env__";
    const group = groups.get(key);
    if (group) {
      if (!group.has(item.path)) group.set(item.path, item);
      continue;
    }

    groups.set(key, new Map([[item.path, item]]));
  }

  return Array.from(groups.entries()).map(([stepId, groupItems]) => {
    const values = Array.from(groupItems.values());
    const firstItem = values[0];
    const presented = firstItem ? presentTemplateSuggestion(firstItem) : null;
    const baseLabel = presented?.groupLabel ?? (stepId === "__env__" ? "Environment" : stepId);
    return {
      stepId,
      label: presented?.alias ? `${presented.alias} — ${baseLabel}` : baseLabel,
      items: values,
    };
  });
}
