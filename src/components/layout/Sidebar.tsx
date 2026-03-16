"use client";

import { Folder, History, Settings, Terminal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Playground",
      icon: Terminal,
    },
    {
      href: "/collections",
      label: "Collections",
      icon: Folder,
    },
    {
      href: "/history",
      label: "History",
      icon: History,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="flex w-64 flex-col border-r bg-muted/30">
      <div className="flex items-center px-4 py-4 border-b">
        <span className="text-sm font-bold tracking-tight uppercase opacity-50">Navigation</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({
                  variant: pathname === item.href ? "secondary" : "ghost",
                  size: "sm",
                }),
                "w-full justify-start gap-2 font-medium",
                pathname === item.href && "bg-accent text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-muted/5">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
            DevWiz v2
          </p>
          <p className="text-[10px] font-bold text-muted-foreground opacity-20">
            Internal API Toolkit
          </p>
        </div>
      </div>
    </aside>
  );
}
