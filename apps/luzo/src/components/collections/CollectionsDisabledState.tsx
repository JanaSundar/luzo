"use client";

import { ArrowRight, Database, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils";

export function CollectionsDisabledState() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative flex w-full max-w-3xl flex-col items-center text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          DB connection needed
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-4xl">
          Connect your database to unlock reusable collections.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Collections are the long-lived source of truth. History stays local and temporary, but
          saved requests need an active database connection before you can create, edit, or share
          them.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/settings" className={cn(buttonVariants({ size: "sm" }))}>
            Open Settings
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Schema-safe setup only
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Collections stay in your DB
          </div>
        </div>
      </div>
    </div>
  );
}
