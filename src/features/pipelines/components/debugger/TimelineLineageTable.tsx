"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { maskSensitiveValue } from "@/features/pipeline/sensitivity";
import type { TimelineLineageRow } from "./timelineLineageUtils";

export function TimelineLineageTable({ rows }: { rows: TimelineLineageRow[] }) {
  if (rows.length === 0) {
    return <p className="text-xs italic text-muted-foreground">No lineage data for this event</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/10">
      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b bg-background/70 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <span>Field</span>
        <span>Reference</span>
        <span>Runtime value</span>
        <span>Passed through</span>
      </div>
      <div className="divide-y divide-border/40">
        {rows.map((row) => (
          <LineageTableRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function LineageTableRow({ row }: { row: TimelineLineageRow }) {
  const [runtimeRevealed, setRuntimeRevealed] = useState(false);
  const [passedRevealed, setPassedRevealed] = useState(false);
  const runtimeDisplay =
    row.isSensitive && !runtimeRevealed ? maskSensitiveValue(row.runtimeValue) : row.runtimeValue;
  const passedDisplay =
    row.isSensitive && !passedRevealed ? maskSensitiveValue(row.passedValue) : row.passedValue;

  return (
    <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-xs">
      <div className="min-w-0">
        <p className="truncate font-mono text-foreground">{row.field}</p>
        <p className="mt-1 text-[10px] capitalize text-muted-foreground">
          {row.status.replaceAll("_", " ")}
        </p>
      </div>
      <p className="min-w-0 break-all font-mono text-muted-foreground">{row.reference}</p>
      <ValueCell
        value={runtimeDisplay}
        rawValue={row.runtimeValue}
        isSensitive={row.isSensitive}
        revealed={runtimeRevealed}
        onToggle={() => setRuntimeRevealed((current) => !current)}
      />
      <ValueCell
        value={passedDisplay}
        rawValue={row.passedValue}
        isSensitive={row.isSensitive}
        revealed={passedRevealed}
        onToggle={() => setPassedRevealed((current) => !current)}
      />
    </div>
  );
}

function ValueCell({
  value,
  rawValue,
  isSensitive,
  revealed,
  onToggle,
}: {
  value: string;
  rawValue: string;
  isSensitive: boolean;
  revealed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-2">
        <p className="min-w-0 break-all font-mono text-foreground">{value || "—"}</p>
        {isSensitive ? (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={revealed ? "Hide sensitive value" : "Show sensitive value"}
            title={revealed ? "Hide sensitive value" : "Show sensitive value"}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </div>
      {isSensitive ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          {revealed ? "Sensitive value shown" : "Sensitive value hidden"}
        </p>
      ) : rawValue ? null : null}
    </div>
  );
}
