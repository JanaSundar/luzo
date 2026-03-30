"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { EnvironmentManagerDialog } from "./EnvironmentManagerDialog";

export function EnvironmentSelector() {
  const { environments, activeEnvironmentId, setActiveEnvironment } = useEnvironmentStore();
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <div className="flex items-center gap-2.5">
      <Select value={activeEnvironmentId ?? ""} onValueChange={setActiveEnvironment}>
        <SelectTrigger className="h-8.5 w-48 rounded-xl border-border/40 bg-background/40 px-3.5 text-xs font-semibold tracking-tight shadow-sm transition-all hover:bg-background/80 hover:border-border/80 focus:ring-2 focus:ring-primary/20">
          <SelectValue placeholder="Environment">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="truncate">{activeEnv?.name || "No active environment"}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl">
          {environments.map((env) => (
            <SelectItem key={env.id} value={env.id} className="rounded-lg py-2 focus:bg-primary/5">
              {env.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <EnvironmentManagerDialog />
    </div>
  );
}
