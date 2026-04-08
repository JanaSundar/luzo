"use client";

import { cn } from "@/utils";

export function StepCardRouteChip({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "failure" | "success";
  value: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
        tone === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
          : "border-rose-500/20 bg-rose-500/10 text-rose-700",
      )}
    >
      <span>{label}</span>
      <span className="max-w-[180px] truncate text-[11px] normal-case tracking-normal">
        {value}
      </span>
    </span>
  );
}
