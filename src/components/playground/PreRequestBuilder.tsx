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
import type { PreRequestRule } from "@/types";

interface PreRequestBuilderProps {
  rules: PreRequestRule[];
  onChange: (rules: PreRequestRule[]) => void;
}

export function PreRequestBuilder({ rules, onChange }: PreRequestBuilderProps) {
  const addRule = () => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        type: "set_env_var",
        key: "",
        value: "",
      },
    ]);
  };

  const updateRule = (id: string, updates: Partial<PreRequestRule>) => {
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
              value={rule.type}
              onValueChange={(v) =>
                updateRule(rule.id, {
                  type: v as PreRequestRule["type"],
                })
              }
            >
              <SelectTrigger className="w-[180px] h-8 text-xs shrink-0">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set_env_var">Set Env Variable</SelectItem>
                <SelectItem value="clear_env_var">Clear Env Variable</SelectItem>
                <SelectItem value="set_header">Set Request Header</SelectItem>
                <SelectItem value="delete_header">Delete Request Header</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={rule.key}
              onChange={(e) => updateRule(rule.id, { key: e.target.value })}
              placeholder={rule.type.includes("env") ? "Variable Name" : "Header Name"}
              className="h-8 text-xs min-w-[120px] flex-1 sm:flex-none sm:w-[140px]"
            />

            {rule.type !== "clear_env_var" && rule.type !== "delete_header" && (
              <Input
                value={rule.value || ""}
                onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                placeholder="Value"
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
            No pre-request actions. Click "Add Action" to perform setup before the run.
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={addRule}>
        <Plus className="h-3.5 w-3.5" />
        Add Action
      </Button>
    </div>
  );
}
