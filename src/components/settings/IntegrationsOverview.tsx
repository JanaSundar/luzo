"use client";

import { Database } from "lucide-react";
import { useDbStore } from "@/lib/stores/useDbStore";
import { useProvidersConfigStore } from "@/lib/stores/useProvidersConfigStore";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/types";
import { AddProviderCard, ProviderConfigCard } from "./ProviderConfigCard";

function extractHostFromDbUrl(url: string): string {
  if (!url) return "";
  try {
    const match = url.match(/@([^/]+)/);
    if (match) {
      return match[1].split(":")[0];
    }
    return "";
  } catch {
    return "";
  }
}

const AI_PROVIDERS: AiProvider[] = ["openai", "openrouter", "groq"];

interface IntegrationsOverviewProps {
  onProviderClick: (provider: AiProvider) => void;
  onAddProviderClick: () => void;
  onDatabaseClick: () => void;
  onConnectDatabaseClick: () => void;
}

export function IntegrationsOverview({
  onProviderClick,
  onAddProviderClick,
  onDatabaseClick,
  onConnectDatabaseClick,
}: IntegrationsOverviewProps) {
  const { providers } = useProvidersConfigStore();
  const { status, latencyMs, dbUrl } = useDbStore();

  const configuredCount = AI_PROVIDERS.filter((p) => providers[p]?.apiKey?.length).length;
  const dbActiveCount = status === "connected" ? 1 : 0;

  const allProvidersOk = AI_PROVIDERS.every(
    (p) => !providers[p]?.apiKey || providers[p].validationStatus !== "invalid"
  );
  const dbOk = status !== "error";
  const allSystemsOk = allProvidersOk && dbOk;

  return (
    <div className="space-y-8 w-full max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Integrations Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your AI providers and database connections.
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
            allSystemsOk
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          )}
        >
          <div
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              allSystemsOk ? "bg-emerald-500" : "bg-amber-500"
            )}
          />
          {allSystemsOk ? "All systems operational" : "Issues detected"}
        </div>
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between mb-3 w-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            AI PROVIDERS
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">
            {configuredCount} Configured
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {AI_PROVIDERS.map((provider) => (
            <ProviderConfigCard
              key={provider}
              provider={provider}
              onClick={() => onProviderClick(provider)}
            />
          ))}
          <AddProviderCard onClick={onAddProviderClick} />
        </div>
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between mb-3 w-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            DATABASES
          </span>
          <span className="text-[10px] font-bold text-muted-foreground">
            {dbActiveCount} Active
          </span>
        </div>
        <div className="space-y-3 w-full">
          {status === "connected" && dbUrl ? (
            <button
              type="button"
              onClick={onDatabaseClick}
              className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all text-left"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold tracking-tight">PostgreSQL Production</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    PRIMARY
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  {extractHostFromDbUrl(dbUrl)}
                  {latencyMs != null && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{latencyMs}ms</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold">Connected</span>
              </div>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConnectDatabaseClick}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all"
          >
            <Database className="h-5 w-5" />
            <span className="text-sm font-medium">Connect Database</span>
          </button>
        </div>
      </div>
    </div>
  );
}
