"use client";

import { Cpu, Database, LayoutGrid } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { DatabaseConfigView } from "@/components/settings/DatabaseConfigView";
import { IntegrationsOverview } from "@/components/settings/IntegrationsOverview";
import { ProviderConfigView } from "@/components/settings/ProviderConfigView";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/types";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "providers", label: "Providers", icon: Cpu },
  { id: "database", label: "Database", icon: Database },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: (typeof TABS)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={segmentedTabTriggerClassName(isActive, "h-9 gap-2 px-4 whitespace-nowrap")}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{tab.label}</span>
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const {
    providers,
    activeAiProvider: activeProvider,
    setActiveAiProvider: setActiveProvider,
  } = useSettingsStore();
  const { setAIProvider } = usePipelineDebugStore();

  useEffect(() => {
    const config = providers[activeProvider];
    if (config?.apiKey && config.validationStatus === "valid") {
      setAIProvider({
        provider: activeProvider,
        model: config.model,
        apiKey: config.apiKey,
      });
    }
  }, [activeProvider, providers, setAIProvider]);

  const handleProviderClick = (provider: AiProvider) => {
    setActiveProvider(provider);
    setActiveTab("providers");
  };

  const handleAddProviderClick = () => {
    setActiveTab("providers");
  };

  const handleDatabaseClick = () => {
    setActiveTab("database");
  };

  const handleConnectDatabaseClick = () => {
    setActiveTab("database");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
      <div className="flex-1 flex flex-col items-center gap-8 p-5 md:p-8 h-full overflow-hidden min-h-0">
        <div className="w-full max-w-5xl flex flex-col gap-8 flex-1 min-h-0 min-w-0">
          <div
            className={cn(
              "flex w-fit shrink-0 items-stretch self-center",
              segmentedTabListClassName
            )}
          >
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <AnimatedTabContent key="overview">
                  <div className="flex justify-center">
                    <IntegrationsOverview
                      onProviderClick={handleProviderClick}
                      onAddProviderClick={handleAddProviderClick}
                      onDatabaseClick={handleDatabaseClick}
                      onConnectDatabaseClick={handleConnectDatabaseClick}
                    />
                  </div>
                </AnimatedTabContent>
              )}
              {activeTab === "providers" && (
                <AnimatedTabContent key="providers">
                  <div className="flex w-full justify-center py-2 md:py-4">
                    <ProviderConfigView />
                  </div>
                </AnimatedTabContent>
              )}
              {activeTab === "database" && (
                <AnimatedTabContent key="database">
                  <div className="flex w-full justify-center py-2 md:py-4">
                    <DatabaseConfigView />
                  </div>
                </AnimatedTabContent>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
