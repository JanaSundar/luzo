"use client";

import { motion } from "motion/react";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const Header = dynamic(() => import("./Header").then((mod) => mod.Header), {
  ssr: false,
});

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen flex flex-col bg-background selection:bg-primary selection:text-primary-foreground overflow-x-hidden font-sans">
      {/* Premium Monochromatic Background Layer */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-muted/50 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-muted/50 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <Header />
      <motion.main
        className="flex flex-1 min-h-0 w-full relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </motion.main>
    </div>
  );
}
