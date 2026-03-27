"use client";

import { AlertCircle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { cn } from "@/utils";

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: "emerald",
  },
  error: {
    icon: XCircle,
    color: "red",
  },
  warning: {
    icon: AlertCircle,
    color: "amber",
  },
  info: {
    icon: Info,
    color: "blue",
  },
  loading: {
    icon: Loader2,
    color: "muted",
    isLoader: true,
  },
} as const;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  const icons = Object.entries(TOAST_CONFIG).reduce(
    (acc, [key, config]) => {
      const Icon = config.icon;
      const isLoader = "isLoader" in config && config.isLoader;

      acc[key as keyof typeof TOAST_CONFIG] = (
        <Icon
          className={cn(
            "size-5 shrink-0",
            isLoader ? "text-muted-foreground animate-spin" : `text-${config.color}-500`,
          )}
        />
      );
      return acc;
    },
    {} as Record<string, React.ReactNode>,
  );

  const statusClasses = Object.entries(TOAST_CONFIG).reduce(
    (acc, [key, config]) => {
      if ("isLoader" in config && config.isLoader) return acc;
      acc[key] = `!border-l-4 !border-l-${config.color}-500`;
      return acc;
    },
    {} as Record<string, string>,
  );

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={icons}
      toastOptions={{
        classNames: {
          toast: cn(
            "cn-toast group !p-4 !items-center !gap-3",
            "!bg-background !text-foreground !border-border",
            "shadow-lg !rounded-lg transition-all duration-300",
          ),
          ...statusClasses,
          title: "!text-sm !font-semibold !text-foreground !mt-[1px]",
          description: "!text-xs !text-muted-foreground/80 !leading-snug !mt-1",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
