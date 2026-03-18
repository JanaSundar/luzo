"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateInput } from "@/components/ui/template-input";
import type { AuthConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";

interface RequestAuthPanelProps {
  auth: AuthConfig;
  suggestions: VariableSuggestion[];
  onChange: (auth: AuthConfig) => void;
}

export function RequestAuthPanel({ auth, suggestions, onChange }: RequestAuthPanelProps) {
  return (
    <div className="space-y-4">
      <Select
        value={auth.type}
        onValueChange={(v) => onChange({ ...auth, type: v as AuthConfig["type"] })}
      >
        <SelectTrigger className="w-40 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Auth</SelectItem>
          <SelectItem value="bearer">Bearer Token</SelectItem>
          <SelectItem value="basic">Basic Auth</SelectItem>
          <SelectItem value="api-key">API Key</SelectItem>
        </SelectContent>
      </Select>

      {auth.type === "bearer" && (
        <TemplateInput
          value={auth.bearer?.token ?? ""}
          onChange={(token) => onChange({ ...auth, bearer: { token } })}
          suggestions={suggestions}
          placeholder="Bearer token"
          inputClassName="h-9 text-sm font-mono border border-input rounded-md bg-background px-3"
        />
      )}

      {auth.type === "basic" && (
        <div className="flex gap-2">
          <TemplateInput
            value={auth.basic?.username ?? ""}
            onChange={(val) =>
              onChange({
                ...auth,
                basic: { username: val, password: auth.basic?.password ?? "" },
              })
            }
            suggestions={suggestions}
            placeholder="Username"
            inputClassName="text-sm h-9 border border-input rounded-md bg-background px-3"
          />
          <Input
            type="password"
            value={auth.basic?.password ?? ""}
            onChange={(e) =>
              onChange({
                ...auth,
                basic: { username: auth.basic?.username ?? "", password: e.target.value },
              })
            }
            placeholder="Password"
            className="text-sm"
          />
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="flex gap-2">
          <TemplateInput
            value={auth.apiKey?.key ?? ""}
            onChange={(val) =>
              onChange({
                ...auth,
                apiKey: {
                  key: val,
                  value: auth.apiKey?.value ?? "",
                  placement: auth.apiKey?.placement ?? "header",
                },
              })
            }
            suggestions={suggestions}
            placeholder="Header name"
            inputClassName="text-sm h-9 border border-input rounded-md bg-background px-3"
          />
          <TemplateInput
            value={auth.apiKey?.value ?? ""}
            onChange={(val) =>
              onChange({
                ...auth,
                apiKey: {
                  key: auth.apiKey?.key ?? "",
                  value: val,
                  placement: auth.apiKey?.placement ?? "header",
                },
              })
            }
            suggestions={suggestions}
            placeholder="API key value"
            inputClassName="h-9 text-sm font-mono border border-input rounded-md bg-background px-3"
          />
        </div>
      )}
    </div>
  );
}
