"use client";

import { type ReactNode } from "react";
import { AnimatedTabContent } from "@/components/ui/animated-tab-content";
import { cn } from "@/utils";

export function RequestFormTabPanel({
  animate,
  className,
  children,
}: {
  animate: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (animate) return <AnimatedTabContent className={className}>{children}</AnimatedTabContent>;
  return <div className={cn("block w-full min-w-0", className)}>{children}</div>;
}
