"use client";

import { GitBranch, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/utils";

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
  trueTarget: string | null;
  falseTarget: string | null;
  onChange: (next: ConditionNodeConfig) => void;
}

export function ConditionNodeInspector({
  config,
  suggestions,
  trueTarget,
  falseTarget,
  onChange,
}: ConditionNodeInspectorProps) {
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

      {/* Rules */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50">
            Conditions (all must pass)
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddRule}
            className="h-7 gap-1.5 px-2 text-[11px]"
          >
            <Plus className="h-3 w-3" />
            Add rule
          </Button>
        </div>

        {(config.rules ?? []).length === 0 ? (
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
        <PathDisplay label="True path" target={trueTarget} semantics="true" />
        <PathDisplay label="False path" target={falseTarget} semantics="false" />
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
        <Input
          value={rule.valueRef}
          onChange={(e) => onChange(rule.id, { valueRef: e.target.value })}
          placeholder="e.g. req1.response.status"
          className="h-7 font-mono text-[11px]"
          list={`suggestions-${rule.id}`}
        />
        <datalist id={`suggestions-${rule.id}`}>
          {suggestions.map((s) => (
            <option key={s.path} value={s.path} label={s.label} />
          ))}
        </datalist>

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
}

function PathDisplay({ label, target, semantics }: PathDisplayProps) {
  const colorClass = semantics === "true" ? "text-emerald-600" : "text-rose-500";
  const bgClass =
    semantics === "true"
      ? "bg-emerald-500/8 border-emerald-500/20"
      : "bg-rose-500/8 border-rose-500/20";

  return (
    <div className={cn("flex items-center justify-between rounded-md border px-3 py-2", bgClass)}>
      <span className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", colorClass)}>
        {label}
      </span>
      <span className="text-[11px] text-foreground/50">
        {target ? `→ ${target}` : <span className="italic text-foreground/30">not connected</span>}
      </span>
    </div>
  );
}
