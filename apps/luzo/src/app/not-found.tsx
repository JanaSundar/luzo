"use client";

import { FileQuestion } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center max-w-md w-full"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="p-6 rounded-3xl bg-muted/20 border border-border/40 shadow-2xl backdrop-blur-md"
          >
            <FileQuestion className="w-16 h-16 text-primary/80" />
          </motion.div>
          <div className="absolute -bottom-2 -right-3 bg-background border border-border/60 rounded-lg px-2.5 py-1 shadow-lg">
            <span className="text-[9px] font-black tracking-[0.2em] uppercase text-muted-foreground/70">
              Error 404
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter mb-3 bg-gradient-to-b from-foreground to-foreground/40 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-foreground/90">
            Page not found
          </h2>
          <p className="text-muted-foreground mb-12 text-sm sm:text-base leading-relaxed max-w-[280px] sm:max-w-none mx-auto">
            The page you're looking for doesn't exist or has been moved to a new location.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Link href="/" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto font-bold uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-primary/20"
            >
              Go to Playground
            </Button>
          </Link>
          <Link href="/pipelines" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto font-bold uppercase tracking-widest text-[10px] h-11 px-8 backdrop-blur-sm border-border/60"
            >
              Go to Pipelines
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
