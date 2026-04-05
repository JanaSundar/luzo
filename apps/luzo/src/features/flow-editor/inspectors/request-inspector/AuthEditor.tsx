"use client";

import { TemplateInput } from "@/components/ui/template-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuthConfig } from "@/types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { FieldLabel, SectionHeading } from "./shared";

function createAuthConfig(type: AuthConfig["type"]): AuthConfig {
  switch (type) {
    case "bearer":
      return { type, bearer: { token: "" } };
    case "basic":
      return { type, basic: { password: "", username: "" } };
    case "api-key":
      return { type, apiKey: { key: "", placement: "header", value: "" } };
    default:
      return { type: "none" };
  }
}

export function AuthEditor({
  auth,
  disabled,
  suggestions,
  onChange,
}: {
  auth: AuthConfig;
  disabled: boolean;
  suggestions: VariableSuggestion[];
  onChange: (auth: AuthConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeading
        title="Authentication"
        description="Choose the auth mode for this request step."
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <FieldLabel>Type</FieldLabel>
          <Select
            disabled={disabled}
            value={auth.type}
            onValueChange={(type) => onChange(createAuthConfig(type as AuthConfig["type"]))}
          >
            <SelectTrigger className="w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-foreground/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="none">No Auth</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
              <SelectItem value="api-key">API Key</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {auth.type === "none" ? (
          <p className="text-sm text-muted-foreground">
            This request does not send authentication.
          </p>
        ) : null}

        {auth.type === "bearer" ? (
          <div className="space-y-2">
            <FieldLabel htmlFor="request-bearer-token">Token</FieldLabel>
            <TemplateInput
              id="request-bearer-token"
              disabled={disabled}
              inputClassName="rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 font-mono shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
              overlayClassName="px-0"
              placeholder="{{access_token}}"
              suggestions={suggestions}
              value={auth.bearer?.token ?? ""}
              onChange={(token) => onChange({ type: "bearer", bearer: { token } })}
            />
          </div>
        ) : null}

        {auth.type === "basic" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              disabled={disabled}
              id="request-basic-username"
              label="Username"
              suggestions={suggestions}
              value={auth.basic?.username ?? ""}
              onChange={(username) =>
                onChange({
                  type: "basic",
                  basic: { password: auth.basic?.password ?? "", username },
                })
              }
            />
            <LabeledInput
              disabled={disabled}
              id="request-basic-password"
              label="Password"
              type="password"
              suggestions={suggestions}
              value={auth.basic?.password ?? ""}
              onChange={(password) =>
                onChange({
                  type: "basic",
                  basic: { password, username: auth.basic?.username ?? "" },
                })
              }
            />
          </div>
        ) : null}

        {auth.type === "api-key" ? (
          <div className="space-y-4">
            <LabeledInput
              disabled={disabled}
              id="request-api-key-name"
              label="Key"
              placeholder="x-api-key"
              suggestions={suggestions}
              value={auth.apiKey?.key ?? ""}
              onChange={(key) =>
                onChange({
                  type: "api-key",
                  apiKey: {
                    key,
                    placement: auth.apiKey?.placement ?? "header",
                    value: auth.apiKey?.value ?? "",
                  },
                })
              }
            />
            <LabeledInput
              disabled={disabled}
              id="request-api-key-value"
              label="Value"
              placeholder="{{api_key}}"
              suggestions={suggestions}
              value={auth.apiKey?.value ?? ""}
              onChange={(value) =>
                onChange({
                  type: "api-key",
                  apiKey: {
                    key: auth.apiKey?.key ?? "",
                    placement: auth.apiKey?.placement ?? "header",
                    value,
                  },
                })
              }
            />
            <div className="space-y-2">
              <FieldLabel>Placement</FieldLabel>
              <Select
                disabled={disabled}
                value={auth.apiKey?.placement ?? "header"}
                onValueChange={(placement) =>
                  onChange({
                    type: "api-key",
                    apiKey: {
                      key: auth.apiKey?.key ?? "",
                      placement: placement as "header" | "query",
                      value: auth.apiKey?.value ?? "",
                    },
                  })
                }
              >
                <SelectTrigger className="w-full rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-foreground/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="query">Query</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LabeledInput({
  disabled,
  id,
  label,
  onChange,
  placeholder,
  suggestions,
  type,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: VariableSuggestion[];
  type?: string;
  value: string;
}) {
  return (
    <div className="space-y-2 min-w-0">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <TemplateInput
        id={id}
        disabled={disabled}
        inputClassName="rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
        overlayClassName="px-0"
        placeholder={placeholder}
        suggestions={suggestions}
        type={type}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
