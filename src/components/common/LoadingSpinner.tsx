"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Ora-style dots spinner frames */
const DOTS_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Use ora-style dots animation instead of spinning icon */
  variant?: "spinner" | "dots";
}

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };

export function LoadingSpinner({
  className,
  size = "md",
  variant = "spinner",
}: LoadingSpinnerProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (variant !== "dots") return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % DOTS_FRAMES.length);
    }, 80);
    return () => clearInterval(id);
  }, [variant]);

  if (variant === "dots") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center font-mono text-muted-foreground",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-xl",
          className
        )}
      >
        {DOTS_FRAMES[frame]}
      </span>
    );
  }

  return <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size], className)} />;
}
