"use client";

import { useRef } from "react";
import { cn } from "@/utils";

export interface BentoTabItem<T extends string = string> {
  id: T;
  label: string;
  detail?: string;
  badge?: string | number;
  dot?: boolean;
  disabled?: boolean;
}

interface BentoTabsProps<T extends string> {
  items: BentoTabItem<T>[];
  activeItem: T;
  onChange: (item: T) => void;
  ariaLabel: string;
  columns?: 1 | 2 | 4;
  className?: string;
}

function findNextEnabledIndex<T extends string>(
  items: BentoTabItem<T>[],
  startIndex: number,
  direction: 1 | -1,
) {
  for (let offset = 1; offset <= items.length; offset += 1) {
    const nextIndex = (startIndex + offset * direction + items.length) % items.length;
    if (!items[nextIndex]?.disabled) return nextIndex;
  }

  return startIndex;
}

function getColumnsClassName(columns: 1 | 2 | 4) {
  switch (columns) {
    case 1:
      return "grid-cols-1";
    case 4:
      return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";
    case 2:
    default:
      return "grid-cols-1 sm:grid-cols-2";
  }
}

export function BentoTabs<T extends string>({
  items,
  activeItem,
  onChange,
  ariaLabel,
  columns = 2,
  className,
}: BentoTabsProps<T>) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("grid gap-2.5", getColumnsClassName(columns), className)}
    >
      {items.map((item, index) => {
        const active = item.id === activeItem;

        return (
          <button
            key={item.id}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            tabIndex={active ? 0 : -1}
            onClick={() => {
              if (!item.disabled) onChange(item.id);
            }}
            onKeyDown={(event) => {
              if (item.disabled) return;

              let nextIndex = -1;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                nextIndex = findNextEnabledIndex(items, index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                nextIndex = findNextEnabledIndex(items, index, -1);
              } else if (event.key === "Home") {
                nextIndex = items.findIndex((candidate) => !candidate.disabled);
              } else if (event.key === "End") {
                nextIndex = [...items].reverse().findIndex((candidate) => !candidate.disabled);
                nextIndex = nextIndex === -1 ? -1 : items.length - 1 - nextIndex;
              } else {
                return;
              }

              event.preventDefault();
              if (nextIndex < 0 || nextIndex === index) return;

              const nextItem = items[nextIndex];
              if (!nextItem || nextItem.disabled) return;

              onChange(nextItem.id);
              itemRefs.current[nextIndex]?.focus();
            }}
            className={cn(
              "group relative min-w-0 rounded-[1.15rem] border p-3.5 text-left transition-all duration-200 ease-out outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "border-primary/45 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(239,246,255,0.96))] text-foreground shadow-[0_16px_35px_rgba(14,165,233,0.12),0_1px_0_rgba(255,255,255,0.75)_inset] dark:border-sky-400/30 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.98),rgba(12,74,110,0.55))]"
                : "border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.8))] text-foreground/90 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-border/80 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.76),rgba(15,23,42,0.54))]",
              item.disabled &&
                "cursor-not-allowed border-border/35 bg-muted/25 text-muted-foreground opacity-60 shadow-none hover:translate-y-0",
            )}
          >
            <span
              className={cn(
                "pointer-events-none absolute inset-x-3 top-2 h-px rounded-full bg-gradient-to-r from-transparent via-white/90 to-transparent transition-opacity dark:via-white/20",
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            />

            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tracking-[0.01em]">{item.label}</span>
                  {item.dot ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        active
                          ? "bg-sky-500 shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                          : "bg-primary/70",
                      )}
                    />
                  ) : null}
                </span>
                {item.detail ? (
                  <span
                    className={cn(
                      "mt-1.5 block text-[11px] leading-relaxed",
                      active ? "text-foreground/72 dark:text-white/72" : "text-muted-foreground",
                    )}
                  >
                    {item.detail}
                  </span>
                ) : null}
              </span>

              {item.badge !== undefined ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                    active
                      ? "border-primary/20 bg-primary/10 text-primary dark:border-sky-400/20 dark:bg-sky-400/12 dark:text-sky-200"
                      : "border-border/60 bg-background/70 text-muted-foreground",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
