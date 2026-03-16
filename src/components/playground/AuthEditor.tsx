import type React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuthConfig } from "@/types";

interface AuthEditorProps {
  auth: AuthConfig;
  onChange: (auth: AuthConfig) => void;
}

export const AuthEditor: React.FC<AuthEditorProps> = ({ auth, onChange }) => {
  return (
    <div className="space-y-5">
      <Select value={auth.type} onValueChange={(v) => onChange({ type: v as AuthConfig["type"] })}>
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
        <Input
          value={auth.bearer?.token ?? ""}
          onChange={(e) => onChange({ type: "bearer", bearer: { token: e.target.value } })}
          placeholder="Bearer token"
          className="font-mono text-sm"
        />
      )}

      {auth.type === "basic" && (
        <div className="flex gap-2">
          <Input
            value={auth.basic?.username ?? ""}
            onChange={(e) =>
              onChange({
                type: "basic",
                basic: {
                  username: e.target.value,
                  password: auth.basic?.password ?? "",
                },
              })
            }
            placeholder="Username"
            className="text-sm"
          />
          <Input
            type="password"
            value={auth.basic?.password ?? ""}
            onChange={(e) =>
              onChange({
                type: "basic",
                basic: {
                  username: auth.basic?.username ?? "",
                  password: e.target.value,
                },
              })
            }
            placeholder="Password"
            className="text-sm"
          />
        </div>
      )}

      {auth.type === "api-key" && (
        <div className="flex gap-2">
          <Input
            value={auth.apiKey?.key ?? ""}
            onChange={(e) =>
              onChange({
                type: "api-key",
                apiKey: {
                  key: e.target.value,
                  value: auth.apiKey?.value ?? "",
                  placement: auth.apiKey?.placement ?? "header",
                },
              })
            }
            placeholder="Header name"
            className="text-sm"
          />
          <Input
            value={auth.apiKey?.value ?? ""}
            onChange={(e) =>
              onChange({
                type: "api-key",
                apiKey: {
                  key: auth.apiKey?.key ?? "",
                  value: e.target.value,
                  placement: auth.apiKey?.placement ?? "header",
                },
              })
            }
            placeholder="Value"
            className="text-sm"
          />
          <Select
            value={auth.apiKey?.placement ?? "header"}
            onValueChange={(v) =>
              onChange({
                type: "api-key",
                apiKey: {
                  key: auth.apiKey?.key ?? "",
                  value: auth.apiKey?.value ?? "",
                  placement: v as "header" | "query",
                },
              })
            }
          >
            <SelectTrigger className="w-28 text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="header">Header</SelectItem>
              <SelectItem value="query">Query Params</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};
