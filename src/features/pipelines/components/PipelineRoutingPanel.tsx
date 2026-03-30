"use client";

import { ArrowRight, CheckCircle2, OctagonX, Search } from "lucide-react";
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
import type { RequestRouteDisplay, RequestRouteOption } from "@/features/pipeline/request-routing";
import { cn } from "@/utils";
import { METHOD_COLORS } from "@/utils/http";

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
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Routing</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-[11px]"
          onClick={onReset}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-3">
        <RouteCard
          label="On success"
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          defaultLabel="Continue flow"
          selection={successDisplay}
          selectedTarget={successTarget}
          otherValue={failureTarget}
          options={options}
          onChange={onSuccessChange}
        />
        <RouteCard
          label="On failure"
          icon={<OctagonX className="h-4 w-4 text-rose-600" />}
          defaultLabel="Stop pipeline"
          selection={failureDisplay}
          selectedTarget={failureTarget}
          otherValue={successTarget}
          options={options}
          onChange={onFailureChange}
        />
      </div>
    </section>
  );
}

function RouteCard({
  defaultLabel,
  icon,
  label,
  onChange,
  options,
  otherValue,
  selectedTarget,
  selection,
}: {
  defaultLabel: string;
  icon: ReactNode;
  label: string;
  onChange: (value: string | null) => void;
  options: RequestRouteOption[];
  otherValue: string | null;
  selectedTarget: string | null;
  selection: RequestRouteDisplay;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/40 bg-background p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
      </div>

      <div className="mb-3 rounded-lg border border-border/35 bg-muted/10 px-3 py-2.5">
        <DestinationSummary selection={selection} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={selectedTarget == null ? "secondary" : "outline"}
          className="h-8 rounded-full px-3 text-[11px]"
          onClick={() => onChange(null)}
        >
          {defaultLabel}
        </Button>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-full px-3 text-[11px]"
              />
            }
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Choose request
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(28rem,calc(100vw-4rem))] p-0">
            <Command>
              <CommandInput placeholder="Search requests..." />
              <CommandList>
                <CommandEmpty>No matching request found.</CommandEmpty>
                <CommandGroup heading="Requests">
                  {options.map((option) => (
                    <CommandItem
                      key={option.stepId}
                      value={`${option.label} ${option.subtitle} ${option.detail}`}
                      disabled={otherValue === option.stepId}
                      onSelect={() => {
                        onChange(option.stepId);
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
                      <span className="ml-3 flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
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
        <p className="truncate text-sm font-semibold text-foreground">{selection.label}</p>
      </div>
      <p className="truncate text-xs text-muted-foreground">{selection.subtitle}</p>
    </div>
  );
}
