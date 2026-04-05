"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const transition = { duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] as const };

interface AnimatedTabContentProps {
  children: ReactNode;
  /** Use for flex children that need to fill space (e.g. response body) */
  className?: string;
}

/**
 * Panel enter/exit for tab switching. Render as a direct child of `AnimatePresence`
 * (typically with `mode="wait"`) so exit animations run.
 */
export function AnimatedTabContent({ children, className }: AnimatedTabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={transition}
      className={cn(className ?? "block", "w-full min-w-0 will-change-[opacity]")}
    >
      {children}
    </motion.div>
  );
}
