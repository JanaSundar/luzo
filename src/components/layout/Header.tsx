"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { segmentedTabListClassName, segmentedTabTriggerClassName } from "@/lib/ui/segmentedTabs";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { label: "Playground", href: "/" },
  { label: "Pipelines", href: "/pipelines" },
  { label: "Settings", href: "/settings" },
];

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const activeTheme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center gap-2 border-b px-3 transition-all glass sm:h-14 sm:gap-4 sm:px-4 md:px-6">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
      >
        <Logo size={28} />
      </Link>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <nav className={cn("max-w-full shrink-0 overflow-x-auto", segmentedTabListClassName)}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={segmentedTabTriggerClassName(
                  isActive,
                  "h-8 shrink-0 whitespace-nowrap px-2.5 sm:px-4",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <motion.a
            href="https://github.com/JanaSundar/luzo"
            target="_blank"
            rel="noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted/50"
              aria-label="Open GitHub repository"
            >
              <GitHubIcon className="h-[1.05rem] w-[1.05rem]" />
            </Button>
          </motion.a>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full hover:bg-muted/50"
              aria-label="Toggle theme"
              onClick={() => setTheme(activeTheme === "dark" ? "light" : "dark")}
            >
              <ThemeToggleIcon theme={activeTheme} />
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12c0 5.303 3.438 9.8 8.205 11.385c.6.113.82-.258.82-.577c0-.285-.01-1.04-.015-2.04c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729c1.205.084 1.838 1.236 1.838 1.236c1.07 1.835 2.809 1.305 3.495.998c.108-.776.417-1.305.76-1.605c-2.665-.3-5.466-1.332-5.466-5.93c0-1.31.465-2.38 1.235-3.22c-.135-.303-.54-1.523.105-3.176c0 0 1.005-.322 3.3 1.23c.96-.267 1.98-.399 3-.405c1.02.006 2.04.138 3 .405c2.28-1.552 3.285-1.23 3.285-1.23c.645 1.653.24 2.873.12 3.176c.765.84 1.23 1.91 1.23 3.22c0 4.61-2.805 5.625-5.475 5.92c.42.36.81 1.096.81 2.22c0 1.606-.015 2.896-.015 3.286c0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function ThemeToggleIcon({ theme }: { theme: "light" | "dark" }) {
  const isDark = theme === "dark";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="h-[1.15rem] w-[1.15rem]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.g
        initial={false}
        animate={{
          rotate: isDark ? -30 : 0,
          scale: isDark ? 0.75 : 1,
          opacity: isDark ? 0 : 1,
        }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <motion.circle
          cx="12"
          cy="12"
          r="4.2"
          initial={false}
          animate={{
            scale: isDark ? 0.7 : 1,
            opacity: isDark ? 0 : 1,
          }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          fill="currentColor"
          stroke="none"
        />

        {[
          "12 1.8 12 4.2",
          "12 19.8 12 22.2",
          "1.8 12 4.2 12",
          "19.8 12 22.2 12",
          "4.4 4.4 6.1 6.1",
          "17.9 17.9 19.6 19.6",
          "17.9 6.1 19.6 4.4",
          "4.4 19.6 6.1 17.9",
        ].map((points, index) => (
          <motion.line
            key={points}
            x1={points.split(" ")[0]}
            y1={points.split(" ")[1]}
            x2={points.split(" ")[2]}
            y2={points.split(" ")[3]}
            initial={false}
            animate={{
              strokeDasharray: 4,
              strokeDashoffset: isDark ? 4 : 0,
            }}
            transition={{
              duration: 0.4,
              delay: index * 0.015,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.g>

      <motion.path
        d="M21 12.79A9 9 0 1 1 11.21 3c0 .67.07 1.32.2 1.95a7 7 0 0 0 8.64 8.64c.63.13 1.28.2 1.95.2"
        initial={false}
        animate={{
          opacity: isDark ? 1 : 0,
          scale: isDark ? 1 : 0.7,
        }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        fill="currentColor"
        stroke="none"
        style={{ originX: "50%", originY: "50%" }}
      />
    </svg>
  );
}
