"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface AnimatedTabContentProps {
  children: ReactNode;
  /** Use for flex children that need to fill space (e.g. response body) */
  className?: string;
}

export function AnimatedTabContent({ children, className }: AnimatedTabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className ?? "block"}
    >
      {children}
    </motion.div>
  );
}
