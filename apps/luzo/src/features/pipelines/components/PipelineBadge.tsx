import type { ReactNode } from "react";
import { cn } from "@/utils";

/** Small pill used in timeline / report tables (previously exported from StepCard). */
export function PipelineBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}
