"use client";

import { Trash2 } from "lucide-react";
import { useRef } from "react";
import {
  httpMethodBadgeClass,
  httpMethodLetter,
  httpMethodLetterBareClass,
  httpMethodLetterClass,
  httpMethodPlainExpandedClass,
} from "@/components/playground/sidebar/httpMethodStyles";
import { UrlStartEllipsisText } from "@/components/playground/sidebar/UrlStartEllipsisText";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsTruncated } from "@/lib/hooks/useIsTruncated";
import { cn, DESTRUCTIVE_ICON_BUTTON_CLASSES } from "@/lib/utils";
import { stripMethodPrefixFromRequestName } from "@/lib/utils/requestDisplayName";

type RequestListRowProps = {
  method: string;
  name: string;
  url: string;
  isActive: boolean;
  onClick: () => void;
  /** Collapsed history list: no row / method chip backgrounds */
  plainCollapsedSurface?: boolean;
  /** History: method as colored text only (no muted pill background). */
  plainMethod?: boolean;
  /** Second line (e.g. relative time for history: “last run”). */
  meta?: string;
  /** Remove from list (shows trash on row hover). */
  onDelete?: () => void;
};

export function RequestListRow({
  method,
  name,
  url,
  isActive,
  onClick,
  plainCollapsedSurface = false,
  plainMethod = false,
  meta,
  onDelete,
}: RequestListRowProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const plain = plainCollapsedSurface && collapsed;
  const displayName = stripMethodPrefixFromRequestName(name, method);
  const useBareLetter = plainMethod || plain;
  const hasUrl = Boolean(url.trim());
  const urlRef = useRef<HTMLDivElement>(null);
  const isTruncated = useIsTruncated(urlRef);

  const methodLineExpanded = meta ? (
    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
      <span
        className={cn(
          plainMethod ? httpMethodPlainExpandedClass(method) : httpMethodBadgeClass(method),
          plainMethod && "min-w-0",
        )}
      >
        {method}
      </span>
      <span className="truncate text-[10px] leading-tight text-muted-foreground">{meta}</span>
    </div>
  ) : (
    <span
      className={cn(httpMethodBadgeClass(method, { naturalWidth: true }), "inline-flex shrink-0")}
    >
      {method}
    </span>
  );

  const expandedBody = (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <UrlStartEllipsisText
        ref={urlRef}
        text={displayName}
        className="font-mono text-[11px] text-foreground"
      />
      {methodLineExpanded}
    </div>
  );

  const collapsedBody = (
    <>
      <span
        className={
          useBareLetter ? httpMethodLetterBareClass(method) : httpMethodLetterClass(method)
        }
        title={method}
      >
        {httpMethodLetter(method)}
      </span>
      <div className="sr-only">
        <UrlStartEllipsisText
          text={displayName}
          className="font-mono text-[11px] text-foreground"
        />
      </div>
    </>
  );

  const buttonClassName = cn(
    "box-border flex min-w-0 overflow-hidden rounded-md px-1.5 py-1.5 text-left transition-colors",
    onDelete && !collapsed ? "h-full w-full min-w-0 flex-1" : "w-full",
    collapsed ? "items-center gap-1 px-1" : "flex-col items-stretch gap-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    !plain && "hover:bg-transparent",
    !plain && isActive && "font-medium text-foreground",
    plain && "hover:bg-transparent",
  );

  const inner = collapsed ? collapsedBody : expandedBody;

  const mainButton = (
    <button type="button" onClick={onClick} className={buttonClassName}>
      {inner}
    </button>
  );

  const tooltipContent = (
    <TooltipContent
      hideArrow
      side="right"
      align="start"
      sideOffset={10}
      className="max-w-[min(28rem,calc(100vw-3rem))] border border-border/40 bg-popover px-3 py-2 text-popover-foreground shadow-lg"
    >
      <p className="break-all font-mono text-[11px] leading-relaxed">{url}</p>
    </TooltipContent>
  );

  const shouldShowTooltip = hasUrl && (collapsed || isTruncated);

  const mainWithTooltip = shouldShowTooltip ? (
    <Tooltip>
      <TooltipTrigger render={mainButton} />
      {tooltipContent}
    </Tooltip>
  ) : (
    mainButton
  );

  const deleteButton =
    onDelete != null && !collapsed ? (
      <button
        type="button"
        aria-label="Delete request"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          DESTRUCTIVE_ICON_BUTTON_CLASSES,
        )}
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0" />
      </button>
    ) : null;

  if (onDelete != null) {
    return (
      <div className="flex w-full min-w-0 max-w-full items-center gap-1">
        <div className="min-w-0 flex-1 overflow-hidden">{mainWithTooltip}</div>
        {deleteButton}
      </div>
    );
  }

  if (hasUrl) {
    return <div className="w-full min-w-0 max-w-full">{mainWithTooltip}</div>;
  }

  return mainButton;
}
