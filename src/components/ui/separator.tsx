"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 data-horizontal:h-px data-horizontal:w-full data-horizontal:bg-gradient-to-r data-horizontal:from-transparent data-horizontal:via-border data-horizontal:to-transparent data-vertical:w-px data-vertical:self-stretch data-vertical:bg-gradient-to-b data-vertical:from-transparent data-vertical:via-border data-vertical:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
