"use client";

import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
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
    <div className="flex min-h-[32px] shrink-0 items-center">
      <div
        role="tablist"
        className={cn("min-w-0 max-w-full overflow-x-auto", segmentedTabListClassName)}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = disabledTabs.includes(tab.id);

          return (
            <button
              key={`${instanceId}-${tab.id}`}
              type="button"
              role="tab"
              aria-label={tab.label}
              aria-selected={isActive}
              disabled={isDisabled}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              className={cn(
                segmentedTabTriggerClassName(
                  isActive,
                  "h-7 shrink-0 gap-1.5 px-3 sm:px-4 whitespace-nowrap"
                ),
                isDisabled && "cursor-not-allowed opacity-50 grayscale-[0.5]"
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "flex h-[14px] min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none",
                      isActive
                        ? "bg-white text-black dark:bg-black dark:text-white"
                        : "bg-black/12 text-black/55 dark:bg-white/12 dark:text-white/55"
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
