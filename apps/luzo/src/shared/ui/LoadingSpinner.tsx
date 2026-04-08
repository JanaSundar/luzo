"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/shared/lib/cn";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots";
}

const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
const dotSizes = { sm: "h-1.5 w-1.5", md: "h-2 w-2", lg: "h-2.5 w-2.5" };

export function LoadingSpinner({
  className,
  size = "md",
  variant = "spinner",
}: LoadingSpinnerProps) {
  if (variant === "dots") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)}>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "inline-block rounded-full bg-current opacity-40 animate-pulse",
              dotSizes[size],
            )}
            style={{ animationDelay: `${index * 160}ms` }}
          />
        ))}
      </span>
    );
  }

  return <Spinner className={cn("text-muted-foreground", sizes[size], className)} />;
}
