"use client";
import { CheckCircle2, GitBranchPlus, OctagonX, Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { METHOD_COLORS } from "@/utils/http";
import { cn } from "@/utils";
import type { RequestRouteDisplay, RequestRouteOption } from "@/features/pipeline/request-routing";

interface PipelineRoutingPanelProps {
  failureDisplay: RequestRouteDisplay;
  failureTarget: string | null;
  onFailureChange: (value: string | null) => void;
  onReset: () => void;
  onSuccessChange: (value: string | null) => void;
  options: RequestRouteOption[];
  successDisplay: RequestRouteDisplay;
  successTarget: string | null;
}

const STOP_VALUE = "__stop__";
export function PipelineRoutingPanel({
  failureDisplay,
  failureTarget,
  onFailureChange,
  onReset,
  onSuccessChange,
  options,
  successDisplay,
  successTarget,
}: PipelineRoutingPanelProps) {
  return (
    <section className="rounded-2xl border border-border/35 bg-background/75 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <GitBranchPlus className="h-3.5 w-3.5" />
            Routing
          </div>
          <p className="text-sm text-muted-foreground">
            Choose what happens next for success and failure.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
      <div className="grid gap-3">
        <RoutePicker
          description="Leave empty to continue with the normal flow."
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label="On success"
          onValueChange={onSuccessChange}
          options={options}
          otherValue={failureTarget}
          selection={successDisplay}
        />
        <RoutePicker
          description="Leave empty to stop the pipeline on failure."
          icon={<OctagonX className="h-4 w-4 text-rose-600" />}
          label="On failure"
          onValueChange={onFailureChange}
          options={options}
          otherValue={successTarget}
          selection={failureDisplay}
        />
      </div>
    </section>
  );
}

function RoutePicker({
  description,
  icon,
  label,
  onValueChange,
  options,
  otherValue,
  selection,
}: {
  description: string;
  icon: ReactNode;
  label: string;
  onValueChange: (value: string | null) => void;
  options: RequestRouteOption[];
  otherValue: string | null;
  selection: RequestRouteDisplay;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border/35 bg-background p-4">
      <div className="mb-3 flex items-start gap-2">
        {icon}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full justify-between rounded-xl border-border/45 bg-background px-4 py-3 text-left shadow-none hover:bg-muted/10"
            />
          }
        >
          <div className="min-w-0 flex-1">
            <DestinationSummary selection={selection} />
          </div>
          <Search className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(28rem,calc(100vw-4rem))] p-0">
          <Command>
            <CommandInput placeholder="Search request destinations..." />
            <CommandList>
              <CommandEmpty>No matching request found.</CommandEmpty>
              <CommandGroup heading="Destinations">
                <CommandItem
                  value={STOP_VALUE}
                  onSelect={() => {
                    onValueChange(null);
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0">
                    <p className="font-medium">Stop pipeline</p>
                    <p className="truncate text-xs text-muted-foreground">End this outcome path.</p>
                  </div>
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.stepId}
                    value={`${option.label} ${option.subtitle} ${option.detail}`}
                    disabled={otherValue === option.stepId}
                    onSelect={() => {
                      onValueChange(option.stepId);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.14em]",
                            METHOD_COLORS[option.method],
                          )}
                        >
                          {option.method}
                        </span>
                        <p className="truncate font-medium">{option.label}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{option.subtitle}</p>
                    </div>
                    <span className="ml-3 shrink-0 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {option.detail}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
function DestinationSummary({ selection }: { selection: RequestRouteDisplay }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {selection.method ? (
          <span
            className={cn(
              "text-[11px] font-bold uppercase tracking-[0.14em]",
              METHOD_COLORS[selection.method],
            )}
          >
            {selection.method}
          </span>
        ) : null}
        <p className="truncate text-sm font-semibold">{selection.label}</p>
      </div>
      <p className="truncate text-xs text-muted-foreground">{selection.subtitle}</p>
    </div>
  );
}
