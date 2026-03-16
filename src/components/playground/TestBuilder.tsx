import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TestRule } from "@/types";

interface TestBuilderProps {
  rules: TestRule[];
  onChange: (rules: TestRule[]) => void;
}

export function TestBuilder({ rules, onChange }: TestBuilderProps) {
  const addRule = () => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        target: "status_code",
        operator: "equals",
        value: "200",
      },
    ]);
  };

  const updateRule = (id: string, updates: Partial<TestRule>) => {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <Select
              value={rule.target}
              onValueChange={(v) =>
                updateRule(rule.id, {
                  target: v as TestRule["target"],
                  property: v === "json_property" || v === "header" ? "" : undefined,
                })
              }
            >
              <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status_code">Status Code</SelectItem>
                <SelectItem value="json_property">JSON Property</SelectItem>
                <SelectItem value="response_time">Response Time</SelectItem>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="body_contains">Body Contains</SelectItem>
              </SelectContent>
            </Select>

            {(rule.target === "json_property" || rule.target === "header") && (
              <Input
                value={rule.property || ""}
                onChange={(e) => updateRule(rule.id, { property: e.target.value })}
                placeholder={rule.target === "json_property" ? "e.g. data.user.id" : "Header-Name"}
                className="h-8 text-xs min-w-[120px] flex-1 sm:flex-none sm:w-[140px]"
              />
            )}

            <Select
              value={rule.operator}
              onValueChange={(v) => updateRule(rule.id, { operator: v as TestRule["operator"] })}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs shrink-0">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="not_contains">Not Contains</SelectItem>
                {rule.target !== "header" && rule.target !== "body_contains" && (
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                )}
                {rule.target !== "header" && rule.target !== "body_contains" && (
                  <SelectItem value="less_than">Less Than</SelectItem>
                )}
                {(rule.target === "json_property" || rule.target === "header") && (
                  <SelectItem value="exists">Exists</SelectItem>
                )}
                {(rule.target === "json_property" || rule.target === "header") && (
                  <SelectItem value="not_exists">Does Not Exist</SelectItem>
                )}
              </SelectContent>
            </Select>

            {rule.operator !== "exists" && rule.operator !== "not_exists" && (
              <Input
                value={rule.value || ""}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                placeholder="Expected value"
                className="h-8 text-xs flex-1 min-w-[100px]"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => removeRule(rule.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground py-2 italic text-center border border-dashed rounded-md">
            No assertions. Click "Add Assertion" to define what success looks like.
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={addRule}>
        <Plus className="h-3.5 w-3.5" />
        Add Assertion
      </Button>
    </div>
  );
}
