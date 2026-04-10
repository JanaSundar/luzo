"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { type VariantProps, cva } from "class-variance-authority";
import { LayoutGroup, motion } from "motion/react";
import { createContext, useContext, useId } from "react";
import { cn } from "@/utils";

const TabsContext = createContext<{ layoutId: string }>({ layoutId: "tabs" });

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  const id = useId();
  const layoutId = `tabs-${id}`;

  return (
    <TabsContext.Provider value={{ layoutId }}>
      <LayoutGroup id={layoutId}>
        <TabsPrimitive.Root
          data-slot="tabs"
          data-orientation={orientation}
          className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
          {...props}
        />
      </LayoutGroup>
    </TabsContext.Provider>
  );
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-full p-0.5 text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col border border-border/50 bg-muted/50",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 bg-transparent border-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const { layoutId } = useContext(TabsContext);

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <TabsPrimitive.Indicator className="absolute z-0">
        <motion.div
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-primary shadow-sm"
          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
        />
      </TabsPrimitive.Indicator>
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({ className, children, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex h-full items-center justify-center gap-1.5 rounded-full px-4 py-0 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap text-muted-foreground transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground hover:bg-muted/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        "aria-[selected=true]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5">
        {children}
      </span>
    </TabsPrimitive.Tab>
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
