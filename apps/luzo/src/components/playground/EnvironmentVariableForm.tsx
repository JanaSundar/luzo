import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnvironmentStore } from "@/lib/stores/useEnvironmentStore";
import { cn } from "@/utils";

interface EnvironmentVariableFormProps {
  environmentId: string;
}

export function EnvironmentVariableForm({ environmentId }: EnvironmentVariableFormProps) {
  const { updateEnvironmentVariable } = useEnvironmentStore();

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isNewSecret, setIsNewSecret] = useState(false);
  const [showNewValue, setShowNewValue] = useState(false);

  const addVar = () => {
    if (!environmentId || !newKey) return;
    updateEnvironmentVariable(environmentId, newKey, newValue, isNewSecret);
    setNewKey("");
    setNewValue("");
    setIsNewSecret(false);
    setShowNewValue(false);
  };

  return (
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
          title={isNewSecret ? "Sensitive value (encrypted in storage)" : "Non-sensitive value"}
        >
          {isNewSecret ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
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
  );
}
