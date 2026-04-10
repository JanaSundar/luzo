"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { JsonView } from "@/components/ui/JsonView";
import { formatBytes } from "@/features/pipeline/timeline/format-utils";
import { cn } from "@/utils";

export function MetaRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex gap-4 border-b border-muted/20 py-2 last:border-0">
      <span className="min-w-[120px] shrink-0 text-xs font-mono text-muted-foreground">
        {label}
      </span>
      <span className={cn("break-all text-xs font-mono", className)}>{value}</span>
    </div>
  );
}

export function CopyableMetaRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <CopyButton
          copied={copied}
          label={label}
          onCopy={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(`${label} copied`);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        />
      </div>
      <p className="break-all text-xs font-mono">{value}</p>
    </div>
  );
}

export function HeaderBlock({ headers }: { headers: Record<string, string> }) {
  const headerText = useMemo(() => JSON.stringify(headers, null, 2), [headers]);

  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Headers</p>
          <p className="text-[10px] text-muted-foreground">{Object.keys(headers).length} total</p>
        </div>
        <CopyButton label="Headers" onCopy={() => navigator.clipboard.writeText(headerText)} />
      </div>
      {Object.keys(headers).length > 0 ? (
        <div className="space-y-0">
          {Object.entries(headers).map(([key, value]) => (
            <MetaRow key={key} label={key} value={value} />
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">No headers</p>
      )}
    </div>
  );
}

export function BodyBlock({
  title,
  body,
  className,
}: {
  title: string;
  body: string | null;
  className?: string;
}) {
  if (!body)
    return <p className="text-xs italic text-muted-foreground">No {title.toLowerCase()} data</p>;

  const parsed = tryParseJson(body);
  const displayText = parsed ? JSON.stringify(parsed, null, 2) : body;

  return (
    <div className={cn("rounded-lg border bg-muted/10 p-3", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{getBodySizeLabel(body)}</p>
        </div>
        <CopyButton label={title} onCopy={() => navigator.clipboard.writeText(displayText)} />
      </div>
      <div className="max-h-[420px] overflow-hidden rounded-lg border bg-background">
        {parsed ? (
          <JsonView text={displayText} className="h-[320px]" fontScale="sm" />
        ) : (
          <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-all p-3 text-xs font-mono">
            {body}
          </pre>
        )}
      </div>
    </div>
  );
}

export function PayloadSummaryCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; value: string; className?: string }>;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 p-3">
      <p className="mb-3 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
            <p className={cn("mt-1 break-all text-xs font-mono", item.className)}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({
  label,
  onCopy,
  copied: controlledCopied,
}: {
  label: string;
  onCopy: () => Promise<void> | void;
  copied?: boolean;
}) {
  const [internalCopied, setInternalCopied] = useState(false);
  const copied = controlledCopied ?? internalCopied;

  const handleCopy = async () => {
    try {
      await onCopy();
      if (controlledCopied === undefined) {
        setInternalCopied(true);
        window.setTimeout(() => setInternalCopied(false), 1500);
      }
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-primary transition-colors hover:text-primary/80"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function getBodySizeLabel(body: string | null | undefined) {
  if (!body) return "0b";
  return formatBytes(new TextEncoder().encode(body).length);
}
