"use client";

import { Check, Copy, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponseStats } from "@/components/playground/ResponseStats";
import { cn } from "@/utils";

function getFontScaleLabel(scale: "sm" | "md" | "lg") {
  switch (scale) {
    case "sm":
      return "A";
    case "md":
      return "A+";
    case "lg":
    default:
      return "A++";
  }
}

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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <ResponseStats status={status} statusText={statusText} time={time} size={size} />

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Font Scale Selector - Matches image style */}
        <div className="flex items-center rounded-full border border-border/40 bg-muted/20 p-0.5">
          {(["sm", "md", "lg"] as const).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => onFontScaleChange(scale)}
              className={cn(
                "h-7 min-w-10 rounded-full px-2 text-[10px] font-bold transition-all",
                fontScale === scale
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/20"
                  : "text-muted-foreground/60 hover:text-foreground/80",
              )}
              aria-label={`Set response font to ${scale}`}
            >
              {getFontScaleLabel(scale)}
            </button>
          ))}
        </div>

        {/* Search Input - Clean & Inline */}
        {!searchDisabled && (
          <div className="relative group">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-foreground/60" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-[140px] rounded-full border border-border/60 bg-background/60 pl-8 pr-3 text-[11px] font-medium transition-all focus-visible:w-[200px] h-8"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 border-l border-border/30 pl-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground/50 hover:bg-background hover:text-foreground"
            onClick={onCopy}
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground/50 hover:bg-background hover:text-foreground"
            onClick={onDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
