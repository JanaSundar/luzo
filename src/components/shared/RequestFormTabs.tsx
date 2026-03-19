"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type TabId = "params" | "headers" | "body" | "auth" | "scripts";

interface RequestFormTabsProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  paramCount: number;
  headerCount: number;
  hasTestResults: boolean;
  instanceId?: string;
  disabledTabs?: TabId[];
}

export function RequestFormTabs({
  activeTab,
  onTabChange,
  paramCount,
  headerCount,
  hasTestResults,
  instanceId = "global",
  disabledTabs = [],
}: RequestFormTabsProps) {
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "params", label: "Params", count: paramCount },
    { id: "headers", label: "Headers", count: headerCount },
    { id: "body", label: "Body" },
    { id: "auth", label: "Auth" },
    { id: "scripts", label: "Scripts", count: hasTestResults ? 1 : 0 },
  ];

  return (
    <div className="flex items-center shrink-0 min-h-[32px]">
      <div
        role="tablist"
        className="flex items-center gap-0.5 rounded-full bg-muted/40 p-0.5 border border-border/40 overflow-hidden"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = disabledTabs.includes(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={isActive}
              disabled={isDisabled}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              className={cn(
                "relative flex h-7 items-center gap-2 px-3 sm:px-4 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold transition-all rounded-full outline-none whitespace-nowrap",
                isActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/30",
                isDisabled && "opacity-50 cursor-not-allowed grayscale-[0.5]"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`tab-pill-${instanceId}`}
                  className="absolute inset-0 bg-primary rounded-full shadow-sm"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[8px] font-black leading-none",
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
