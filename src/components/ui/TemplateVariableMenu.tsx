"use client";

import type { UseComboboxReturnValue } from "downshift";
import { AnimatePresence, motion } from "motion/react";
import type { TemplateMenuPosition } from "@/lib/utils/templateMenuPosition";
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
  const menuProps = getMenuProps({}, { suppressRefError: true });

  return (
    <div
      {...menuProps}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
      aria-hidden={!isOpen || items.length === 0}
    >
      <AnimatePresence>
        {isOpen && items.length > 0 ? (
          <motion.div
            style={{
              position: position.position,
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
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
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
              top: { type: "spring", stiffness: 520, damping: 38, mass: 0.65 },
              left: { type: "spring", stiffness: 520, damping: 38, mass: 0.65 },
              width: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
              maxHeight: { duration: 0.18, ease: "easeOut" },
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
                        <span className="block font-mono text-[11px] leading-tight">
                          {item.path}
                        </span>
                        <span className="block text-[10px] leading-tight text-muted-foreground">
                          {item.label}
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
