"use client";

import {
  segmentedTabBadgeClassName,
  segmentedTabListClassName,
  segmentedTabTriggerClassName,
} from "@/utils/ui/segmentedTabs";
import { cn } from "@/utils";

export type TabId =
  | "params"
  | "headers"
  | "body"
  | "auth"
  | "scripts"
  | "async"
  | "routing"
  | "mock";

interface RequestFormTabsProps {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
  paramCount: number;
  headerCount: number;
  hasTestResults: boolean;
  instanceId?: string;
  disabledTabs?: TabId[];
  routingConfigured?: boolean;
  showMockTab?: boolean;
  showRoutingTab?: boolean;
  mockEnabled?: boolean;
  asyncConfigured?: boolean;
}

export function RequestFormTabs({
  activeTab,
  onTabChange,
  paramCount,
  headerCount,
  hasTestResults,
  instanceId = "global",
  disabledTabs = [],
  routingConfigured = false,
  showMockTab = false,
  showRoutingTab = false,
  mockEnabled = false,
  asyncConfigured = false,
}: RequestFormTabsProps) {
  const tabs: { id: TabId; label: string; count?: number; dot?: boolean }[] = [
    { id: "params", label: "Params", count: paramCount },
    { id: "headers", label: "Headers", count: headerCount },
    { id: "body", label: "Body" },
    { id: "auth", label: "Auth" },
    { id: "scripts", label: "Scripts", count: hasTestResults ? 1 : 0 },
    { id: "async", label: "Async Controls", dot: asyncConfigured },
  ];

  if (showRoutingTab) {
    tabs.push({ id: "routing", label: "Routing", dot: routingConfigured });
  }

  if (showMockTab) {
    tabs.push({ id: "mock", label: "Mock", dot: mockEnabled });
  }

  return (
    <div className="flex min-h-[36px] w-full min-w-0 shrink-0 items-center overflow-hidden">
      <div className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          role="tablist"
          className={cn("inline-flex min-w-max items-center", segmentedTabListClassName)}
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
                  segmentedTabTriggerClassName(isActive, "h-8 shrink-0 whitespace-nowrap text-xs"),
                  isDisabled && "cursor-not-allowed opacity-50 grayscale-[0.5]",
                )}
              >
                <span className="flex items-center gap-1.5">
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={segmentedTabBadgeClassName(isActive)}>{tab.count}</span>
                  )}
                  {tab.dot && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isActive
                          ? "bg-primary"
                          : "bg-foreground shadow-[0_0_8px_rgba(15,23,42,0.18)]",
                      )}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
