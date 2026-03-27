"use client";

import { Eye, EyeOff, Lock, Plus, Trash2, Unlock } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { cn, DESTRUCTIVE_ICON_BUTTON_CLASSES } from "@/utils";

export function EnvironmentSelector() {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
    deleteEnvironment,
    updateEnvironmentVariable,
    toggleEnvironmentVariableSecret,
    deleteEnvironmentVariable,
  } = useEnvironmentStore();

  const [newEnvName, setNewEnvName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isNewSecret, setIsNewSecret] = useState(false);
  const [showNewValue, setShowNewValue] = useState(false);
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

  const addVar = () => {
    if (!activeEnvironmentId || !newKey) return;
    updateEnvironmentVariable(activeEnvironmentId, newKey, newValue, isNewSecret);
    setNewKey("");
    setNewValue("");
    setIsNewSecret(false);
    setShowNewValue(false);
  };

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

                <div className="shrink-0 flex gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                  <div className="flex-1">
                    <Input
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addVar()}
                      placeholder="Key"
                      className="h-8 text-[11px] font-mono rounded border-border/60 bg-background"
                    />
                  </div>
                  <div className="relative flex-[1.5] flex items-center gap-1">
                    <div className="relative flex-1">
                      <Input
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addVar()}
                        placeholder="Value"
                        type={isNewSecret && !showNewValue ? "password" : "text"}
                        className="h-8 text-[11px] font-mono rounded border-border/60 bg-background pr-8"
                      />
                      {isNewSecret && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-background border-transparent hover:border-border/30 transition-all opacity-60 hover:opacity-100"
                          onClick={() => setShowNewValue(!showNewValue)}
                          title={showNewValue ? "Hide value" : "Show value"}
                        >
                          {showNewValue ? (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Eye className="h-3 w-3 text-primary" />
                          )}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded border border-border/40 transition-all",
                        isNewSecret
                          ? "bg-primary/10 border-primary/40 text-primary shadow-inner"
                          : "text-muted-foreground opacity-60 hover:opacity-100",
                      )}
                      onClick={() => setIsNewSecret(!isNewSecret)}
                      title={
                        isNewSecret
                          ? "Sensitive value (encrypted in storage)"
                          : "Non-sensitive value"
                      }
                    >
                      {isNewSecret ? (
                        <Lock className="h-3.5 w-3.5" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 px-4 rounded-md font-bold uppercase tracking-wider text-[10px] shadow-xs active:scale-95 transition-all"
                    onClick={addVar}
                  >
                    Add
                  </Button>
                </div>

                <div
                  ref={variablesScrollRef}
                  className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2"
                >
                  {activeEnv.variables.map((v) => {
                    const isSecret = v.secret;
                    const isRevealed = revealedKeys.has(v.key);
                    const isMasked = isSecret && !isRevealed;
                    const displayValue = isMasked ? "••••••••" : v.value;
                    return (
                      <div
                        key={v.key}
                        className="flex items-center gap-4 p-2 rounded-md border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors group"
                      >
                        <span className="text-[11px] font-mono font-bold flex-1 truncate text-muted-foreground/80 group-hover:text-foreground transition-colors">
                          {v.key}
                        </span>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <span className="min-w-0 flex-1 truncate text-[11px] font-mono text-foreground/70">
                                {displayValue}
                              </span>
                            }
                          />
                          <TooltipContent
                            side="top"
                            align="start"
                            className="max-w-[24rem] break-all font-mono text-[11px] p-2 rounded-md"
                          >
                            {displayValue}
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 rounded-md border border-transparent transition-all",
                              isSecret
                                ? "text-primary opacity-100 hover:bg-primary/5"
                                : "text-muted-foreground opacity-40 hover:opacity-100",
                            )}
                            onClick={() =>
                              activeEnvironmentId &&
                              toggleEnvironmentVariableSecret(activeEnvironmentId, v.key)
                            }
                            title={isSecret ? "Sensitive value" : "Mark as sensitive"}
                          >
                            {isSecret ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Unlock className="h-3 w-3" />
                            )}
                          </Button>

                          {isSecret && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-md hover:bg-background border border-transparent hover:border-border/50 shadow-xs active:scale-90 transition-all"
                              onClick={() => toggleReveal(v.key)}
                              title={isRevealed ? "Hide value" : "Reveal sensitive value"}
                            >
                              {isRevealed ? (
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 text-primary" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 rounded-md hover:bg-background border border-transparent hover:border-border/50 shadow-xs active:scale-90 transition-all",
                              DESTRUCTIVE_ICON_BUTTON_CLASSES,
                            )}
                            onClick={() =>
                              activeEnvironmentId &&
                              deleteEnvironmentVariable(activeEnvironmentId, v.key)
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
