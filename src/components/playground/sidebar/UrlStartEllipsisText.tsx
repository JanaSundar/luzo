import { cn } from "@/lib/utils";

/** Truncates from the start so the end of the path/query stays visible. */
export function UrlStartEllipsisText({ text, className }: { text: string; className?: string }) {
  return (
    <div
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
}
