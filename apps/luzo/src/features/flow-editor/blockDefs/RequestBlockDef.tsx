"use client";

import { Ellipsis, Play, PlayCircle } from "lucide-react";
import type { BlockDefinition, RequestNode } from "@luzo/flow-types";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import type { CSSProperties, ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import type { RequestBlock } from "../domain/types";
import { RequestInspector } from "../inspectors/RequestInspector";

export function createRequestBlockDef(
  blockMap: Map<string, unknown>,
  getSuggestions?: (requestId: string) => VariableSuggestion[],
  options?: {
    onRunFresh?: (nodeId: string) => void | Promise<void>;
    onStartHere?: (nodeId: string) => void | Promise<void>;
  },
): BlockDefinition {
  return {
    type: "request",
    minWidth: 312,
    handles: [
      { id: "input", position: "left", type: "target" },
      { id: "success", position: "right", type: "source", label: "Success" },
      { id: "fail", position: "right", type: "source", label: "Fail" },
    ],
    renderCard: (node) => (
      <RequestNodeCard
        node={node as RequestNode}
        onRunFresh={options?.onRunFresh}
        onStartHere={options?.onStartHere}
      />
    ),
    renderInspector: (node, api) => (
      <RequestInspector
        api={api}
        block={blockMap.get(node.id) as RequestBlock | undefined}
        node={node as RequestNode}
        suggestions={getSuggestions?.(node.id) ?? []}
      />
    ),
  };
}

function RequestNodeCard({
  node,
  onRunFresh,
  onStartHere,
}: {
  node: RequestNode;
  onRunFresh?: (nodeId: string) => void | Promise<void>;
  onStartHere?: (nodeId: string) => void | Promise<void>;
}) {
  const title = node.data.label?.trim() || "Request";
  const meta = [
    node.data.paramCount ? `${node.data.paramCount} params` : null,
    node.data.headerCount ? `${node.data.headerCount} headers` : null,
    node.data.authType ? `Auth: ${node.data.authType}` : "Auth: none",
  ]
    .filter(Boolean)
    .join(" • ");
  const hasRunActions = Boolean(onStartHere || onRunFresh);
  const requestAccent = "var(--fb-node-accent-request, #f97316)";

  return (
    <div className="grid min-w-0 gap-3.5">
      <div className="grid min-w-0 grid-cols-[6px_minmax(0,1fr)] items-start gap-2.5">
        <div
          className="min-h-[58px] rounded-full"
          style={{
            background: `linear-gradient(180deg, ${requestAccent}, color-mix(in srgb, ${requestAccent} 48%, transparent))`,
            boxShadow: `0 0 0 1px color-mix(in srgb, ${requestAccent} 24%, transparent)`,
          }}
        />
        <div className="grid min-w-0 gap-2">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <div
                className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[0.14em]"
                style={{ color: "var(--fb-text-secondary, #6b7280)" }}
              >
                <span>Request</span>
                <span className="truncate normal-case tracking-normal opacity-85">
                  {node.data.executionState ?? "idle"}
                </span>
              </div>
              <div
                className="truncate text-sm font-semibold leading-[1.35]"
                style={{ color: "var(--fb-text-primary, #111827)" }}
              >
                {title}
              </div>
            </div>
            {hasRunActions ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="h-7 w-7 rounded-full"
                      style={requestMenuButtonStyle}
                      aria-label={`Request actions for ${title}`}
                    >
                      <Ellipsis className="h-3.5 w-3.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-44">
                  {onStartHere ? (
                    <DropdownMenuItem
                      className="text-xs font-medium"
                      onClick={() => onStartHere(node.id)}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Start Here
                    </DropdownMenuItem>
                  ) : null}
                  {onRunFresh ? (
                    <DropdownMenuItem
                      className="text-xs font-medium"
                      onClick={() => onRunFresh(node.id)}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run Fresh
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase"
              style={requestMethodBadgeStyle}
            >
              {node.data.method ?? "GET"}
            </span>
            <div
              className="min-w-0 flex-1 truncate text-xs"
              style={{
                color: "var(--fb-text-primary, #111827)",
                fontFamily: "var(--fb-font-mono, ui-monospace, monospace)",
              }}
            >
              {node.data.url?.trim() || "https://api.example.com"}
            </div>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap gap-2">
        <RequestChip>{meta || "No request details yet"}</RequestChip>
        <RequestChip>
          {node.data.bodyType ? `Body: ${node.data.bodyType}` : "Body: none"}
        </RequestChip>
      </div>
    </div>
  );
}

function RequestChip({ children }: { children: ReactNode }) {
  return (
    <div
      className="max-w-full truncate rounded-full px-2.5 py-1.5 text-[11px] leading-none"
      style={requestChipStyle}
    >
      {children}
    </div>
  );
}

const requestChipStyle: CSSProperties = {
  background: "var(--fb-node-chip-bg, rgba(15, 23, 42, 0.04))",
  border: "1px solid var(--fb-node-chip-border, rgba(148, 163, 184, 0.16))",
  color: "var(--fb-text-secondary, #6b7280)",
};

const requestMenuButtonStyle: CSSProperties = {
  background: "var(--fb-node-section-bg, rgba(148, 163, 184, 0.08))",
  border: "1px solid var(--fb-node-section-border, rgba(148, 163, 184, 0.18))",
  color: "var(--fb-text-secondary, #6b7280)",
};

const requestMethodBadgeStyle: CSSProperties = {
  background:
    "color-mix(in srgb, var(--fb-node-accent-request, #f97316) 12%, var(--fb-node-bg, #ffffff))",
  border:
    "1px solid color-mix(in srgb, var(--fb-node-accent-request, #f97316) 22%, var(--fb-node-border, rgba(148, 163, 184, 0.22)))",
  color: "var(--fb-text-primary, #111827)",
};
