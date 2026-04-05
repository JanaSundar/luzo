"use client";

import { Database, Eye, EyeOff, Loader2, Server, Unplug, XCircle, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useSettingsStore } from "@/lib/stores/useSettingsStore";
import { cn } from "@/lib/utils";

export function DatabaseConfigView() {
  const {
    dbUrl,
    setDbUrl,
    dbStatus: status,
    dbError: error,
    dbLatencyMs: latencyMs,
    dbSchemaReady: schemaReady,
    dbWarnings: warnings,
    setDbStatus,
  } = useSettingsStore();
  const [showUrl, setShowUrl] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!dbUrl.trim()) return;
    setIsConnecting(true);
    setDbStatus({ dbStatus: "connecting", dbError: null });
    try {
      const res = await fetch("/api/db/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbUrl: dbUrl.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.connected) {
        setDbStatus({
          dbStatus: "connected",
          dbError: null,
          dbSchemaReady: data.schemaReady ?? true,
          dbLatencyMs: data.latencyMs ?? null,
          dbWarnings: data.warnings ?? [],
          dbTables: data.tables ?? [],
        });
        toast.success(
          data.schemaReady
            ? "Database connected successfully"
            : "Database connected with schema warnings",
        );
      } else {
        setDbStatus({
          dbStatus: "error",
          dbError: data.error ?? "Failed to connect",
          dbLatencyMs: data.latencyMs ?? null,
        });
        toast.error(data.error || "Failed to connect to database");
      }
    } catch {
      setDbStatus({ dbStatus: "error", dbError: "Failed to connect" });
      toast.error("Failed to connect to database");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setDbUrl("");
    setDbStatus({
      dbStatus: "disconnected",
      dbError: null,
      dbLatencyMs: null,
      dbSchemaReady: false,
      dbWarnings: [],
      dbTables: [],
    });
    toast.success("Database disconnected");
  };

  return (
    <div className="w-full max-w-3xl space-y-10">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg border border-border/60 flex items-center justify-center shrink-0 bg-background">
          <Database className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Configure PostgreSQL</h2>
          <p className="text-sm text-muted-foreground">
            Manage database connection and credentials.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-1">
            CONNECTION URL
          </label>
          <StatusBadge status={status} latencyMs={latencyMs} />
        </div>

        <div className="relative">
          <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type={showUrl ? "text" : "password"}
            value={dbUrl}
            onChange={(e) => setDbUrl(e.target.value)}
            placeholder="postgresql://user:pass@host:5432/dbname"
            className="h-10 font-mono text-xs pl-10 pr-10 bg-background border border-input focus:border-input focus:ring-1 focus:ring-input/20 transition-all rounded-lg"
            disabled={status === "connected"}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowUrl(!showUrl)}
          >
            {showUrl ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Stored locally. Never transmitted to our servers.
        </p>
        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/5 px-3 py-2 rounded-lg border border-destructive/10 text-[9px] font-bold">
            <XCircle className="h-3 w-3 shrink-0" />
            {error}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              Schema warnings
            </p>
            <div className="space-y-1">
              {warnings.map((warning) => (
                <p key={warning} className="text-[11px] text-amber-800">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/50 pt-7 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleConnect}
          disabled={(!dbUrl && status !== "connected") || status === "connecting"}
          className="h-9 px-4 rounded-lg font-bold uppercase tracking-wider text-[10px] border border-input bg-background hover:bg-muted/30 transition-colors flex items-center gap-2 disabled:opacity-65 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground"
        >
          {status === "connecting" || isConnecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          Test Connection
        </button>
        <button
          type="button"
          onClick={status === "connected" ? handleDisconnect : handleConnect}
          disabled={(!dbUrl && status !== "connected") || status === "connecting"}
          className={cn(
            "h-9 px-6 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all outline-none flex items-center gap-2",
            status === "connected"
              ? "border border-input bg-background hover:bg-muted/30"
              : "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-65 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground",
          )}
        >
          {status === "connecting" || isConnecting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : status === "connected" ? (
            <>
              <Unplug className="h-3.5 w-3.5" />
              <span>Disconnect</span>
            </>
          ) : (
            <span>Save Configuration</span>
          )}
        </button>
      </div>

      {status === "connected" && (
        <p className="text-[11px] text-muted-foreground">
          {schemaReady
            ? "Collections schema is ready."
            : "Connected, but schema needs attention before Collections can be used safely."}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status, latencyMs }: { status: string; latencyMs: number | null }) {
  const fallbackConfig = { color: "bg-muted-foreground/30", label: "Idle" } as const;
  const configs: Record<string, { color: string; label: string }> = {
    connected: { color: "bg-emerald-500", label: "Active" },
    connecting: { color: "bg-amber-500", label: "Connecting..." },
    error: { color: "bg-destructive", label: "Failed" },
    disconnected: fallbackConfig,
  };

  const current = configs[status] ?? fallbackConfig;

  return (
    <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-full border border-border/50">
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          current.color,
          status === "connecting" && "animate-pulse",
        )}
      />
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80">
        {current.label} {status === "connected" && latencyMs != null && `(${latencyMs}ms)`}
      </span>
    </div>
  );
}
