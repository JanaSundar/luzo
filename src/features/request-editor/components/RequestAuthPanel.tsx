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
import { LineageFieldSummary } from "@/features/request-editor/components/LineageFieldSummary";
import type { AuthConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { VariableReferenceEdge } from "@/types/worker-results";

interface RequestAuthPanelProps {
  auth: AuthConfig;
  suggestions: VariableSuggestion[];
  lineageByField?: Record<string, VariableReferenceEdge[]>;
  onChange: (auth: AuthConfig) => void;
}

export function RequestAuthPanel({
  auth,
  suggestions,
  lineageByField = {},
  onChange,
}: RequestAuthPanelProps) {
  return (
    <div className="space-y-4">
      <Select
        value={auth.type}
        onValueChange={(v) => onChange({ ...auth, type: v as AuthConfig["type"] })}
      >
        <SelectTrigger className="h-8 w-40 border-border/40 bg-background text-xs">
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
        <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
          <TemplateInput
            value={auth.bearer?.token ?? ""}
            onChange={(token) => onChange({ ...auth, bearer: { token } })}
            suggestions={suggestions}
            placeholder="Bearer token"
            inputClassName="h-9 rounded-md border border-border/40 bg-background px-3 font-mono text-sm"
          />
          <LineageFieldSummary incoming={lineageByField["auth.bearer.token"] ?? []} />
        </div>
      )}

      {auth.type === "basic" && (
        <div className="grid gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 sm:grid-cols-2">
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
            inputClassName="h-9 rounded-md border border-border/40 bg-background px-3 text-sm"
          />
          <LineageFieldSummary incoming={lineageByField["auth.basic.username"] ?? []} />
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
            className="h-9 border-border/40 bg-background text-sm"
          />
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="grid gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 sm:grid-cols-2">
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
            inputClassName="h-9 rounded-md border border-border/40 bg-background px-3 text-sm"
          />
          <LineageFieldSummary incoming={lineageByField["auth.apiKey.key"] ?? []} />
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
            inputClassName="h-9 rounded-md border border-border/40 bg-background px-3 font-mono text-sm"
          />
          <LineageFieldSummary incoming={lineageByField["auth.apiKey.value"] ?? []} />
        </div>
      )}
    </div>
  );
}
