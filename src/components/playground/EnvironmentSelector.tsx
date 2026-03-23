"use client";

import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { isSensitiveVariableKey } from "@/lib/utils/variableMetadata";
import { cn, DESTRUCTIVE_ICON_BUTTON_CLASSES } from "@/lib/utils";

function getEnvironmentLabel(kind: "manual" | "openapi" | "postman" | undefined) {
  if (kind === "postman") return "Postman";
  if (kind === "openapi") return "OpenAPI";
  return "Manual";
}

export function EnvironmentSelector() {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironment,
    addEnvironment,
    deleteEnvironment,
    updateEnvironmentVariable,
    deleteEnvironmentVariable,
  } = useEnvironmentStore();

  const [newEnvName, setNewEnvName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [maskedKeys, setMaskedKeys] = useState<Set<string>>(new Set());

  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  const addVar = () => {
    if (!activeEnvironmentId || !newKey) return;
    updateEnvironmentVariable(activeEnvironmentId, newKey, newValue);
    setNewKey("");
    setNewValue("");
  };

  const toggleMask = (key: string) => {
    setMaskedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={activeEnvironmentId ?? ""} onValueChange={setActiveEnvironment}>
        <SelectTrigger className="h-8 w-44 text-xs font-medium">
          <SelectValue placeholder="Environment">{activeEnv?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {environments.map((env) => (
            <SelectItem key={env.id} value={env.id}>
              {env.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <DialogTrigger className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted transition-colors">
            <Plus className="h-3.5 w-3.5" />
            Manage
          </DialogTrigger>
        </motion.div>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Environment Variables</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-3">
            <Input
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="New environment name"
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              className="h-8"
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

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-70">
                All Environments
              </p>
              <div className="grid gap-2">
                {environments.map((env) => (
                  <div
                    key={env.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border transition-all",
                      activeEnvironmentId === env.id
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-border/40 hover:border-border/80",
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          activeEnvironmentId === env.id ? "bg-primary" : "bg-muted-foreground/30",
                        )}
                      />
                      <span className="text-sm font-medium truncate">{env.name}</span>
                      <span className="rounded-full border border-border/50 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {getEnvironmentLabel(env.source?.kind)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px]"
                        onClick={() => setActiveEnvironment(env.id)}
                        disabled={activeEnvironmentId === env.id}
                      >
                        {activeEnvironmentId === env.id ? "Active" : "Activate"}
                      </Button>
                      {env.id !== "default" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn("h-7 w-7", DESTRUCTIVE_ICON_BUTTON_CLASSES)}
                          onClick={() => deleteEnvironment(env.id)}
                          title="Delete environment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {activeEnv && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground opacity-70">
                  {activeEnv.name} Variables
                </p>

                {activeEnv.variables.map((v) => {
                  const isMasked = maskedKeys.has(v.key) || isSensitiveVariableKey(v.key);
                  return (
                    <div key={v.key} className="flex items-center gap-2">
                      <span className="text-sm font-mono w-32 truncate text-muted-foreground">
                        {v.key}
                      </span>
                      <span className="text-sm font-mono flex-1 truncate">
                        {isMasked ? "••••••••" : v.value}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleMask(v.key)}
                      >
                        {isMasked ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-7 w-7", DESTRUCTIVE_ICON_BUTTON_CLASSES)}
                        onClick={() =>
                          activeEnvironmentId &&
                          deleteEnvironmentVariable(activeEnvironmentId, v.key)
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}

                <div className="flex gap-2 mt-3">
                  <Input
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Key"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Value"
                    className="h-8 text-sm"
                  />
                  <Button size="sm" className="h-8" onClick={addVar}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
