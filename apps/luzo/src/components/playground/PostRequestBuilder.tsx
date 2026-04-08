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
import type { PostRequestRule } from "@/types";

interface PostRequestBuilderProps {
  rules: PostRequestRule[];
  onChange: (rules: PostRequestRule[]) => void;
}

export function PostRequestBuilder({ rules, onChange }: PostRequestBuilderProps) {
  const addRule = () =>
    onChange([...rules, { id: crypto.randomUUID(), type: "set_env_var", key: "", value: "" }]);

  const updateRule = (id: string, updates: Partial<PostRequestRule>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
            <Select
              value={rule.type}
              onValueChange={(value) =>
                updateRule(rule.id, { type: value as PostRequestRule["type"] })
              }
            >
              <SelectTrigger className="h-8 w-[190px] shrink-0 text-xs">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="set_env_var">Set Env Variable</SelectItem>
                <SelectItem value="clear_env_var">Clear Env Variable</SelectItem>
                <SelectItem value="set_response_header">Set Response Header</SelectItem>
                <SelectItem value="delete_response_header">Delete Response Header</SelectItem>
                <SelectItem value="set_response_body">Set Response Body</SelectItem>
              </SelectContent>
            </Select>

            {rule.type !== "set_response_body" ? (
              <Input
                value={rule.key}
                onChange={(event) => updateRule(rule.id, { key: event.target.value })}
                placeholder={rule.type.includes("env") ? "Variable Name" : "Header Name"}
                className="h-8 min-w-[120px] flex-1 text-xs sm:w-[140px] sm:flex-none"
              />
            ) : null}

            {rule.type !== "clear_env_var" && rule.type !== "delete_response_header" ? (
              <Input
                value={rule.value || ""}
                onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                placeholder={rule.type === "set_response_body" ? "Body value" : "Value"}
                className="h-8 min-w-[100px] flex-1 text-xs"
              />
            ) : null}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onChange(rules.filter((ruleItem) => ruleItem.id !== rule.id))}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {rules.length === 0 ? (
          <p className="rounded-md border border-dashed py-2 text-center text-xs italic text-muted-foreground">
            No post-request actions. Add a response transform or env update.
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={addRule}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Action
      </Button>
    </div>
  );
}
