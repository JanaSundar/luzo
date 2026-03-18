"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { label: "Playground", href: "/" },
  { label: "Pipelines", href: "/pipelines" },
  { label: "Settings", href: "/settings" },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 flex h-12 sm:h-14 items-center gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 transition-all border-b glass">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Logo size={28} />
      </Link>

      <div className="ml-auto flex items-center gap-3 sm:gap-6">
        <nav className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5 border border-border/50 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex h-7 items-center px-2.5 sm:px-4 text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold transition-all rounded-full outline-none whitespace-nowrap",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-primary rounded-full shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted/50"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </motion.div>
      </div>
    </header>
  );
}
