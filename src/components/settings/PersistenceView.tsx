"use client";

import { Database, Eye, EyeOff, Loader2, Server, ShieldCheck, Unplug, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useDbStore } from "@/lib/stores/useDbStore";
import { cn } from "@/lib/utils";

export function PersistenceView() {
  const { dbUrl, setDbUrl, status, error, latencyMs, connect, disconnect } = useDbStore();
  const [showUrl, setShowUrl] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
      toast.success("Database connected successfully");
    } catch {
      toast.error(error || "Failed to connect to database");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Database disconnected");
    } catch {
      toast.error("Failed to disconnect from database");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1 flex items-center gap-2">
            <Server className="h-3 w-3" />
            PostgreSQL URL
          </label>
          <StatusBadge status={status} latencyMs={latencyMs} />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showUrl ? "text" : "password"}
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="postgresql://user:pass@host:5432/dbname"
              className="h-10 font-mono text-xs pr-10 bg-background border-primary/20 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all rounded-xl"
              disabled={status === "connected"}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowUrl(!showUrl)}
            >
              {showUrl ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
          <button
            type="button"
            className={cn(
              "h-10 px-6 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all outline-none flex items-center gap-2",
              status === "connected"
                ? "bg-muted text-muted-foreground border border-border/50 hover:bg-muted/80"
                : "bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95"
            )}
            onClick={status === "connected" ? handleDisconnect : handleConnect}
            disabled={(!dbUrl && status !== "connected") || status === "connecting"}
          >
            {status === "connecting" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Connecting</span>
              </>
            ) : status === "connected" ? (
              <>
                <Unplug className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </>
            ) : (
              <>
                <Database className="h-3.5 w-3.5" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-destructive bg-destructive/5 px-3 py-2 rounded-lg border border-destructive/10 text-[9px] font-bold"
          >
            <XCircle className="h-3 w-3 shrink-0" />
            {error}
          </motion.div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 bg-primary/[0.02] border border-primary/10 rounded-xl">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted-foreground leading-relaxed italic">
          Credentials are only in session memory. All DB logic is encrypted server-side.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status, latencyMs }: { status: string; latencyMs: number | null }) {
  const configs: Record<string, { color: string; label: string }> = {
    connected: { color: "bg-emerald-500", label: "Active" },
    connecting: { color: "bg-amber-500", label: "Connecting..." },
    error: { color: "bg-destructive", label: "Failed" },
    idle: { color: "bg-muted-foreground/30", label: "Idle" },
  };

  const current = configs[status] || configs.idle;

  return (
    <div className="flex items-center gap-2 bg-muted/40 px-3 py-1 rounded-full border border-border/50">
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          current.color,
          status === "connecting" && "animate-pulse"
        )}
      />
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80">
        {current.label} {status === "connected" && latencyMs != null && `(${latencyMs}ms)`}
      </span>
    </div>
  );
}

import { motion } from "motion/react";
