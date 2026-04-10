import { Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { cn, DESTRUCTIVE_ICON_BUTTON_CLASSES } from "@/utils";
import type { Environment } from "@/types";

interface EnvironmentVariableRowProps {
  environmentId: string;
  variable: Environment["variables"][number];
  isRevealed: boolean;
  onToggleReveal: (key: string) => void;
}

export function EnvironmentVariableRow({
  environmentId,
  variable,
  isRevealed,
  onToggleReveal,
}: EnvironmentVariableRowProps) {
  const { toggleEnvironmentVariableSecret, deleteEnvironmentVariable } = useEnvironmentStore();

  const isSecret = variable.secret;
  const isMasked = isSecret && !isRevealed;
  const displayValue = isMasked ? "••••••••" : variable.value;

  return (
    <div className="flex items-center gap-4 p-2 rounded-md border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors group">
      <span className="text-[11px] font-mono font-bold flex-1 truncate text-muted-foreground/80 group-hover:text-foreground transition-colors">
        {variable.key}
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
          onClick={() => toggleEnvironmentVariableSecret(environmentId, variable.key)}
          title={isSecret ? "Sensitive value" : "Mark as sensitive"}
        >
          {isSecret ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </Button>

        {isSecret && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md hover:bg-background border border-transparent hover:border-border/50 shadow-xs active:scale-90 transition-all"
            onClick={() => onToggleReveal(variable.key)}
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
          onClick={() => deleteEnvironmentVariable(environmentId, variable.key)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
