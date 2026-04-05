import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const UrlStartEllipsisText = forwardRef<
  HTMLDivElement,
  { text: string; className?: string }
>(function UrlStartEllipsisText({ text, className }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "block w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left",
        className,
      )}
      dir="rtl"
    >
      <span dir="ltr" className="inline-block max-w-full">
        {text}
      </span>
    </div>
  );
});
