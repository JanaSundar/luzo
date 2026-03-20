"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import type React from "react";
import { cn } from "@/lib/utils";

interface WorkspacePaneProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  border?: boolean;
}

export function WorkspacePane({ children, className, border, ...props }: WorkspacePaneProps) {
  return (
    <motion.div
      className={cn(
        "h-full flex flex-col min-h-0 glass rounded-xl overflow-hidden shadow-premium transition-all duration-300",
        border ? "border border-border" : "border-0",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
