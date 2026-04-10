"use client";

import { GitBranch, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VariablePathInput } from "@/components/ui/variable-path-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConditionRule } from "@/types";
import type { ConditionNodeConfig } from "@/types/workflow";
import type { VariableSuggestion } from "@/types/pipeline-runtime";
import type { RequestRouteOption } from "@/features/pipeline/request-routing";
import { cn } from "@/utils";

const EMPTY_ROUTE_VALUE = "none";

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "exists", label: "exists" },
  { value: "not_exists", label: "not exists" },
] as const;

const VALUE_HIDDEN_OPERATORS: ConditionRule["operator"][] = ["exists", "not_exists"];

interface ConditionNodeInspectorProps {
  config: ConditionNodeConfig;
  suggestions: VariableSuggestion[];
  routeOptions: RequestRouteOption[];
  trueTarget: string | null;
  falseTarget: string | null;
  onChange: (next: ConditionNodeConfig) => void;
  onTrueTargetChange: (targetId: string | null) => void;
  onFalseTargetChange: (targetId: string | null) => void;
}

export function ConditionNodeInspector({
  config,
  suggestions,
  routeOptions,
  trueTarget,
  falseTarget,
  onChange,
  onTrueTargetChange,
  onFalseTargetChange,
}: ConditionNodeInspectorProps) {
  const [mode, setMode] = useState<"rules" | "expression">(() =>
    config.expression ? "expression" : "rules",
  );

  const handleModeChange = useCallback(
    (next: "rules" | "expression") => {
      setMode(next);
      if (next === "expression") {
        onChange({ ...config, rules: [] });
      } else {
        onChange({ ...config, expression: "" });
      }
    },
    [config, onChange],
  );

  const handleExpressionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...config, expression: e.target.value });
    },
    [config, onChange],
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, label: e.target.value });
    },
    [config, onChange],
  );

  const handleAddRule = useCallback(() => {
    const newRule: ConditionRule = {
      id: crypto.randomUUID(),
      valueRef: "",
      operator: "equals",
      value: "",
    };
    onChange({ ...config, rules: [...(config.rules ?? []), newRule] });
  }, [config, onChange]);

  const handleRuleChange = useCallback(
    (ruleId: string, partial: Partial<ConditionRule>) => {
      onChange({
        ...config,
        rules: (config.rules ?? []).map((r) => (r.id === ruleId ? { ...r, ...partial } : r)),
      });
    },
    [config, onChange],
  );

  const handleRuleDelete = useCallback(
    (ruleId: string) => {
      onChange({ ...config, rules: (config.rules ?? []).filter((r) => r.id !== ruleId) });
    },
    [config, onChange],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Label */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
          Label
        </label>
        <Input value={config.label} onChange={handleLabelChange} placeholder="Condition" />
      </div>

      {/* Conditions */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
            Conditions (all must pass)
          </label>
          <div className="flex items-center gap-1">
            <div className="flex overflow-hidden rounded-md border border-border/40 text-[11px]">
              <button
                type="button"
                onClick={() => handleModeChange("rules")}
                className={cn(
                  "px-2 py-1",
                  mode === "rules"
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:bg-muted/50",
                )}
              >
                Rules
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("expression")}
                className={cn(
                  "border-l border-border/40 px-2 py-1",
                  mode === "expression"
                    ? "bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:bg-muted/50",
                )}
              >
                Expression
              </button>
            </div>
            {mode === "rules" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddRule}
                className="h-7 gap-1.5 px-2 text-[11px]"
              >
                <Plus className="h-3 w-3" />
                Add rule
              </Button>
            )}
          </div>
        </div>

        {mode === "expression" ? (
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={config.expression}
              onChange={handleExpressionChange}
              placeholder="e.g. req1.response.body.users[0].id == 1"
              className="min-h-[80px] font-mono text-[12px]"
            />
            <p className="text-[11px] text-foreground/40">
              JavaScript expression. Use step aliases like{" "}
              <code className="rounded bg-muted/40 px-1 font-mono">req1.response.body.field</code>.
              Must return a truthy value.
            </p>
          </div>
        ) : (config.rules ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-6 text-center">
            <GitBranch className="h-5 w-5 text-foreground/25" />
            <p className="text-[12px] text-foreground/40">
              No conditions yet. Add a rule to define when this branch takes the true path.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {(config.rules ?? []).map((rule, index) => (
              <ConditionRuleRow
                key={rule.id}
                rule={rule}
                index={index}
                suggestions={suggestions}
                onChange={handleRuleChange}
                onDelete={handleRuleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Path display */}
      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
          Paths
        </label>
        <PathSelector
          label="True path"
          semantics="true"
          target={trueTarget}
          otherTarget={falseTarget}
          routeOptions={routeOptions}
          onChange={onTrueTargetChange}
        />
        <PathSelector
          label="False path"
          semantics="false"
          target={falseTarget}
          otherTarget={trueTarget}
          routeOptions={routeOptions}
          onChange={onFalseTargetChange}
        />
      </div>
    </div>
  );
}

interface ConditionRuleRowProps {
  rule: ConditionRule;
  index: number;
  suggestions: VariableSuggestion[];
  onChange: (ruleId: string, partial: Partial<ConditionRule>) => void;
  onDelete: (ruleId: string) => void;
}

function ConditionRuleRow({ rule, index, suggestions, onChange, onDelete }: ConditionRuleRowProps) {
  const hideValue = VALUE_HIDDEN_OPERATORS.includes(rule.operator);

  return (
    <div className="flex items-start gap-2 rounded-md border border-border/30 bg-background/60 p-2.5">
      <span className="mt-2 w-4 shrink-0 text-center text-[10px] font-bold text-foreground/25">
        {index + 1}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Value reference */}
        <VariablePathInput
          value={rule.valueRef}
          onChange={(valueRef) => onChange(rule.id, { valueRef })}
          placeholder="e.g. req1.response.status"
          inputClassName="h-7 text-[11px]"
          aria-label={`Condition variable ${index + 1}`}
          suggestions={suggestions}
        />

        {/* Operator + value */}
        <div className="flex gap-2">
          <Select
            value={rule.operator}
            onValueChange={(v) => onChange(rule.id, { operator: v as ConditionRule["operator"] })}
          >
            <SelectTrigger className="h-7 w-36 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value} className="text-[11px]">
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!hideValue && (
            <Input
              value={rule.value ?? ""}
              onChange={(e) => onChange(rule.id, { value: e.target.value })}
              placeholder="expected value"
              className="h-7 min-w-0 flex-1 text-[11px]"
            />
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(rule.id)}
        className="mt-0.5 h-7 w-7 shrink-0 text-foreground/30 hover:text-destructive"
        aria-label="Delete rule"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

interface PathDisplayProps {
  label: string;
  target: string | null;
  semantics: "true" | "false";
  routeOptions?: RequestRouteOption[];
}

function PathDisplay({ label, target, semantics, routeOptions = [] }: PathDisplayProps) {
  const colorClass = semantics === "true" ? "text-emerald-600" : "text-rose-500";
  const bgClass =
    semantics === "true"
      ? "bg-emerald-500/8 border-emerald-500/20"
      : "bg-rose-500/8 border-rose-500/20";
  const targetOption = routeOptions.find((option) => option.stepId === target);

  return (
    <div className={cn("flex items-center justify-between rounded-md border px-3 py-2", bgClass)}>
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", colorClass)}>
        {label}
      </span>
      <span className="text-[11px] text-foreground/50">
        {target ? (
          targetOption ? (
            `→ ${targetOption.label}`
          ) : (
            "→ Selected request"
          )
        ) : (
          <span className="italic text-foreground/30">not connected</span>
        )}
      </span>
    </div>
  );
}

function PathSelector({
  label,
  target,
  otherTarget,
  semantics,
  routeOptions,
  onChange,
}: PathDisplayProps & {
  routeOptions: RequestRouteOption[];
  otherTarget: string | null;
  onChange: (targetId: string | null) => void;
}) {
  const selectedOption = routeOptions.find((option) => option.stepId === target);
  const availableOptions = routeOptions.filter(
    (option) => option.stepId === target || option.stepId !== otherTarget,
  );

  return (
    <div className="flex flex-col gap-2">
      <PathDisplay
        label={label}
        target={target}
        semantics={semantics}
        routeOptions={routeOptions}
      />
      <Select
        value={target ?? EMPTY_ROUTE_VALUE}
        onValueChange={(value) => onChange(value === EMPTY_ROUTE_VALUE ? null : value)}
      >
        <SelectTrigger className="h-8 text-[11px]" aria-label={`${label} target`}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {target ? (selectedOption?.label ?? "Selected request") : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={EMPTY_ROUTE_VALUE} className="text-[11px]">
            none
          </SelectItem>
          {availableOptions.map((option) => (
            <SelectItem key={option.stepId} value={option.stepId} className="text-[11px]">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
