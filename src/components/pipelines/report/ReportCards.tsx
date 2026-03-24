import type { ReactNode } from "react";
import { Edit2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ReportRenderMode = "preview" | "pdf";

interface ReportSectionProps {
  title: string;
  children?: ReactNode;
  onEdit?: () => void;
  onRefine?: () => void;
  isRefining?: boolean;
  mode?: ReportRenderMode;
}

interface RequestCardProps {
  method: string;
  name: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  url: string;
  children?: ReactNode;
  onEdit?: () => void;
  onRefine?: () => void;
  isRefining?: boolean;
  mode?: ReportRenderMode;
}

export function ReportSection({
  title,
  children,
  onEdit,
  onRefine,
  isRefining,
  mode = "preview",
}: ReportSectionProps) {
  if (!children) return null;

  return (
    <section
      className={cn(
        mode === "pdf"
          ? "mb-8 border-b border-border/60 bg-transparent px-0 pb-6 last:mb-0 last:border-b-0 last:pb-0"
          : "mb-10 rounded-[1.5rem] border border-border/40 bg-background/75 p-6 last:mb-0",
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <h2
            className={cn(
              mode === "pdf"
                ? "text-[11px] font-semibold tracking-[0.08em] text-foreground/75"
                : "text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground",
            )}
          >
            {title}
          </h2>
        </div>

        {mode === "preview" && (onEdit || onRefine) && (
          <SectionActions onEdit={onEdit} onRefine={onRefine} isRefining={isRefining} />
        )}
      </div>

      <div className="max-w-[98%] space-y-5 text-[13px] font-medium leading-[1.7] text-foreground/80">
        {children}
      </div>
    </section>
  );
}

export function ReportList({ items }: { items?: ReactNode[] }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-5 space-y-4 px-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4 text-[15px] font-medium leading-[1.7] text-foreground/80">
          <span className="mt-[6px] shrink-0 text-muted-foreground/40 scale-150 leading-none font-black">
            •
          </span>
          <div className="flex-1">{item}</div>
        </li>
      ))}
    </ul>
  );
}

export function RequestCard({
  method,
  name,
  statusCode,
  latencyMs,
  url,
  children,
  onEdit,
  onRefine,
  isRefining,
  mode = "preview",
}: RequestCardProps) {
  const isSuccess = statusCode != null && statusCode < 400;

  return (
    <div
      className={cn(
        "mb-6 overflow-hidden last:mb-0",
        mode === "pdf"
          ? "break-inside-avoid-page border border-border/60 bg-transparent"
          : "rounded-[1.5rem] border border-border/45 bg-gradient-to-br from-background via-background to-muted/[0.18] shadow-[0_18px_40px_rgba(15,23,42,0.06)]",
      )}
    >
      <div
        className={cn(
          "border-b border-border/40 px-5 py-4",
          mode === "pdf" ? "bg-muted/5" : "bg-muted/10",
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <RequestCardMeta
            method={method}
            name={name}
            statusCode={statusCode}
            latencyMs={latencyMs}
            isSuccess={isSuccess}
          />
          {mode === "preview" && (onEdit || onRefine) && (
            <SectionActions onEdit={onEdit} onRefine={onRefine} isRefining={isRefining} />
          )}
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div
          className={cn(
            "rounded-xl border border-border/40 px-3 py-2",
            mode === "pdf" ? "bg-transparent" : "bg-background/75",
          )}
        >
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Endpoint
          </div>
          <div
            className={cn(
              "mt-1 font-mono text-[11px] text-muted-foreground",
              mode === "pdf" ? "break-all whitespace-normal" : "truncate",
            )}
          >
            {url}
          </div>
        </div>

        <div className="text-[13px] font-medium leading-[1.7] text-foreground/80 selection:bg-foreground selection:text-background">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---- Shared sub-components ---- */

function SectionActions({
  onEdit,
  onRefine,
  isRefining,
}: {
  onEdit?: () => void;
  onRefine?: () => void;
  isRefining?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
      )}
      {onRefine && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-purple-500 hover:text-purple-600 hover:bg-purple-50"
          onClick={onRefine}
          disabled={isRefining}
        >
          {isRefining ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}

function RequestCardMeta({
  method,
  name,
  statusCode,
  latencyMs,
  isSuccess,
}: {
  method: string;
  name: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  isSuccess: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            isSuccess ? "bg-emerald-500" : "bg-rose-500",
          )}
        />
        <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
          {name}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
            isSuccess
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
              : "border-rose-500/20 bg-rose-500/10 text-rose-600",
          )}
        >
          {method}
        </span>
        <span className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70">
          Status {statusCode ?? "ERR"}
        </span>
        <span className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/70 tabular-nums">
          {latencyMs ?? 0}ms
        </span>
      </div>
    </div>
  );
}
