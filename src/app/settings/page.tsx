"use client";

import { Cpu, Database, Info } from "lucide-react";
import { motion } from "motion/react";
import { Suspense, useState } from "react";
import { AIConfigView } from "@/components/settings/AIConfigView";
import { PersistenceView } from "@/components/settings/PersistenceView";
import { WorkspacePane } from "@/components/ui/workspace-pane";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "ai", label: "AI Intelligence", icon: Cpu },
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

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-background shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ai");

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden">
      <div className="flex-1 flex flex-col p-4 md:p-6 space-y-6 h-full overflow-hidden">
        <div className="flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-60">
              Manage AI & Database Configuration
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-border/50">
            <Info className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              Session Memory
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-full w-fit border border-border/50">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        <Suspense fallback={null}>
          <WorkspacePane className="flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar p-6">
              {activeTab === "ai" && (
                <SectionCard>
                  <SectionHeader
                    icon={Cpu}
                    title="AI Intelligence"
                    description="Model Providers & API Keys"
                  />
                  <div className="p-6">
                    <AIConfigView />
                  </div>
                </SectionCard>
              )}
              {activeTab === "database" && (
                <SectionCard>
                  <SectionHeader
                    icon={Database}
                    title="Database"
                    description="PostgreSQL Connection"
                  />
                  <div className="p-6">
                    <PersistenceView />
                  </div>
                </SectionCard>
              )}
            </div>
          </WorkspacePane>
        </Suspense>
      </div>
    </div>
  );
}
