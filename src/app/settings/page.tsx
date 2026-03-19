"use client";

import { Cpu, Database, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { DatabaseConfigView } from "@/components/settings/DatabaseConfigView";
import { IntegrationsOverview } from "@/components/settings/IntegrationsOverview";
import { ProviderConfigView } from "@/components/settings/ProviderConfigView";
import { usePipelineDebugStore } from "@/lib/stores/usePipelineDebugStore";
import { useProvidersConfigStore } from "@/lib/stores/useProvidersConfigStore";
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
      className={cn(
        "relative flex h-9 items-center gap-2 px-4 text-[10px] uppercase tracking-wider font-bold transition-all rounded-full outline-none whitespace-nowrap",
        isActive
          ? "text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="settings-tab"
          className="absolute inset-0 bg-primary rounded-full shadow-sm"
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        />
      )}
      <Icon
        className={cn(
          "relative z-10 h-3.5 w-3.5",
          isActive ? "text-primary-foreground" : "text-muted-foreground"
        )}
      />
      <span className="relative z-10">{tab.label}</span>
    </button>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { providers, activeProvider, setActiveProvider } = useProvidersConfigStore();
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
          <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-full w-fit border border-border/50 shrink-0 self-center">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>

          <div className="flex-1 min-h-0 min-w-0 overflow-y-auto custom-scrollbar pr-1">
            {activeTab === "overview" && (
              <div className="flex justify-center">
                <IntegrationsOverview
                  onProviderClick={handleProviderClick}
                  onAddProviderClick={handleAddProviderClick}
                  onDatabaseClick={handleDatabaseClick}
                  onConnectDatabaseClick={handleConnectDatabaseClick}
                />
              </div>
            )}
            {activeTab === "providers" && (
              <div className="flex justify-center w-full py-2 md:py-4">
                <ProviderConfigView />
              </div>
            )}
            {activeTab === "database" && (
              <div className="flex justify-center w-full py-2 md:py-4">
                <DatabaseConfigView />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
