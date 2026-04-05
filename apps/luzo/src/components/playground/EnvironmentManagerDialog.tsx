import { Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { cn, DESTRUCTIVE_ICON_BUTTON_CLASSES } from "@/utils";
import { EnvironmentVariableForm } from "./EnvironmentVariableForm";
import { EnvironmentVariableRow } from "./EnvironmentVariableRow";

export function EnvironmentManagerDialog() {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
    deleteEnvironment,
  } = useEnvironmentStore();

  const [newEnvName, setNewEnvName] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const variablesScrollRef = useRef<HTMLDivElement>(null);

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  useEffect(() => {
    if (variablesScrollRef.current) {
      variablesScrollRef.current.scrollTo({
        top: variablesScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [activeEnv?.variables.length]);

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Dialog>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <DialogTrigger className="inline-flex h-8.5 items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted hover:text-foreground shadow-xs">
          <Plus className="h-3.5 w-3.5" />
          Manage
        </DialogTrigger>
      </motion.div>
      <DialogContent className="flex h-[min(88dvh,550px)] flex-col overflow-hidden sm:max-w-lg border-border bg-background p-0 shadow-2xl">
        <DialogHeader className="shrink-0 p-6 pb-4 border-b border-border bg-muted/20">
          <DialogTitle className="text-lg font-bold">Environment Variables</DialogTitle>
          <DialogDescription className="text-sm text-balance">
            Manage your project environments and secure variables.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-6 custom-scrollbar">
          <div className="shrink-0 space-y-3">
            <div className="flex gap-2">
              <Input
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="New environment name"
                className="h-9 text-sm rounded-md border-border bg-background focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                className="h-9 px-4 rounded-md font-bold uppercase tracking-wider text-[10px] shadow-xs active:scale-95"
                onClick={() => {
                  if (newEnvName) {
                    addEnvironment(newEnvName);
                    setNewEnvName("");
                  }
                }}
              >
                Create
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 pl-1">
                Available Environments
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={activeEnvironmentId ?? ""} onValueChange={setActiveEnvironment}>
                    <SelectTrigger className="h-9 rounded-md border-border bg-background shadow-xs hover:border-border/80 transition-all">
                      <SelectValue placeholder="Select Environment" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl">
                      {environments.map((env) => (
                        <SelectItem
                          key={env.id}
                          value={env.id}
                          className="rounded-lg py-2 focus:bg-primary/5"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                activeEnvironmentId === env.id
                                  ? "bg-primary shadow-[0_0_6px_rgba(var(--primary),0.4)]"
                                  : "bg-muted-foreground/30",
                              )}
                            />
                            <span className="text-xs font-medium">{env.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {activeEnvironmentId && activeEnvironmentId !== "default" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-md border border-transparent hover:border-border/50 transition-all",
                      DESTRUCTIVE_ICON_BUTTON_CLASSES,
                    )}
                    onClick={() => deleteEnvironment(activeEnvironmentId)}
                    title="Delete environment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {activeEnv && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-4 border-t border-border/60">
              <div className="shrink-0 flex items-center justify-between pl-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  {activeEnv.name} Variables
                </p>
              </div>

              <EnvironmentVariableForm environmentId={activeEnv.id} />

              <div
                ref={variablesScrollRef}
                className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2"
              >
                {activeEnv.variables.map((v) => (
                  <EnvironmentVariableRow
                    key={v.key}
                    environmentId={activeEnv.id}
                    variable={v}
                    isRevealed={revealedKeys.has(v.key)}
                    onToggleReveal={toggleReveal}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
