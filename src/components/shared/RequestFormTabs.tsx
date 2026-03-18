"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type TabId = "params" | "headers" | "body" | "auth" | "scripts";

export const TABS: { id: TabId; label: string }[] = [
  { id: "params", label: "Params" },
  { id: "headers", label: "Headers" },
  { id: "body", label: "Body" },
  { id: "auth", label: "Auth" },
  { id: "scripts", label: "Scripts" },
];

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
  return (
    <div className="flex items-center shrink-0 min-h-[32px]">
      <nav className="flex items-center gap-0.5 rounded-full bg-muted/40 p-0.5 border border-border/40 overflow-hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = disabledTabs.includes(tab.id);
          const count = tab.id === "params" ? paramCount : tab.id === "headers" ? headerCount : 0;
          const showCheck = tab.id === "scripts" && hasTestResults;

          return (
            <button
              key={tab.id}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              className={cn(
                "relative flex h-7 items-center gap-2 px-3 sm:px-4 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold transition-all rounded-full outline-none whitespace-nowrap",
                isActive
                  ? "text-primary-foreground"
                  : isDisabled
                    ? "opacity-30 cursor-not-allowed text-muted-foreground"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/30"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={`tab-pill-${instanceId}`}
                  className="absolute inset-0 bg-primary rounded-full shadow-sm"
                  transition={{
                    type: "spring",
                    bounce: 0.15,
                    duration: 0.5,
                  }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5 pointer-events-none">
                {tab.label}
                {(count > 0 || showCheck) && (
                  <span
                    className={cn(
                      "flex items-center justify-center min-w-[16px] h-4 rounded-full px-1 text-[9px] font-black transition-colors",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    )}
                  >
                    {showCheck ? "✓" : count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
