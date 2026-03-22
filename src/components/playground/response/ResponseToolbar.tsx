"use client";

import { Check, Copy, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponseStats } from "@/components/playground/ResponseStats";
import { cn } from "@/lib/utils";

export function ResponseToolbar({
  status,
  statusText,
  time,
  size,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  searchDisabled,
  onCopy,
  onDownload,
  copied,
  fontScale,
  onFontScaleChange,
}: {
  status: number;
  statusText: string;
  time: number;
  size: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchDisabled: boolean;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  fontScale: "sm" | "md" | "lg";
  onFontScaleChange: (value: "sm" | "md" | "lg") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ResponseStats status={status} statusText={statusText} time={time} size={size} />

      <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
        <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
          {(["sm", "md", "lg"] as const).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => onFontScaleChange(scale)}
              className={cn(
                "h-6 min-w-8 rounded-md px-1.5 text-[10px] font-semibold transition-colors",
                fontScale === scale
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`Set response font to ${scale}`}
            >
              {scale === "sm" ? "A" : scale === "md" ? "A+" : "A++"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-[180px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            disabled={searchDisabled}
            className="h-7 rounded-lg border-border/50 bg-muted/20 pl-7 text-[11px]"
          />
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onCopy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
