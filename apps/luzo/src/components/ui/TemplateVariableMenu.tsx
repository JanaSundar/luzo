"use client";

import type { UseComboboxReturnValue } from "downshift";
import { AnimatePresence, motion } from "motion/react";
import type { TemplateMenuPosition } from "@/utils/templateMenuPosition";
import { cn } from "@/utils";
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
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: position.zIndex }}
      aria-hidden={!isOpen || items.length === 0}
    >
      <AnimatePresence>
        {isOpen && items.length > 0 ? (
          <motion.div
            style={{
              position: position.position,
              top: position.top,
              left: position.left,
              width: position.width,
              maxWidth: position.maxWidth,
              maxHeight: position.maxHeight,
              pointerEvents: "auto",
              transformOrigin: "top center",
            }}
            initial={{
              opacity: 0,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
            }}
            transition={{
              duration: 0.12,
              ease: [0.23, 1, 0.32, 1],
            }}
            className={cn(
              "overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-border/20 backdrop-blur-xl",
              "flex flex-col shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)]",
            )}
          >
            <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/40">
              {groups.map((group) => (
                <div key={group.stepId} className="flex flex-col gap-0.5">
                  {group.label ? (
                    <div className="sticky top-0 z-10 bg-popover/80 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 backdrop-blur-sm">
                      {group.label}
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-0.5 px-1 pb-1">
                    {group.items.map(({ item, index }) => {
                      return (
                        <div
                          key={`${group.stepId}:${item.path}:${index}`}
                          {...getItemProps({ item, index })}
                          className={cn(
                            "group cursor-pointer rounded-lg px-2 py-2 text-xs transition-all duration-75",
                            highlightedIndex === index
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-foreground",
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "block font-mono text-[11px] font-bold leading-tight tracking-tight",
                                highlightedIndex === index
                                  ? "text-slate-50 dark:text-slate-950"
                                  : "text-foreground",
                              )}
                            >
                              {item.path}
                            </span>
                            <span
                              className={cn(
                                "block truncate text-[10px] leading-tight",
                                highlightedIndex === index
                                  ? "text-slate-50/70 dark:text-slate-950/70"
                                  : "text-muted-foreground/70",
                              )}
                            >
                              {item.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
  const groups = new Map<string, Array<{ item: VariableSuggestion; index: number }>>();
  items.forEach((item, index) => {
    const key = item.stepId || "__env__";
    groups.set(key, [...(groups.get(key) ?? []), { item, index }]);
  });

  return Array.from(groups.entries()).map(([stepId, groupItems]) => ({
    stepId,
    label: stepId === "__env__" ? "Environment" : stepId,
    items: groupItems,
  }));
}
