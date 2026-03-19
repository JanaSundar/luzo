"use client";

import { ArrowRight, Clock3, Database, FolderOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollectionsOverviewProps {
  collectionsCount: number;
  savedRequestsCount: number;
  historyCount: number;
}

export function CollectionsOverview({
  collectionsCount,
  savedRequestsCount,
  historyCount,
}: CollectionsOverviewProps) {
  return (
    <section className="w-full overflow-hidden rounded-2xl border border-border/60 bg-background/70 shadow-sm">
      <div className="relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_35%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              DB-backed collections
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                A clean request library for reusable API work.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Collections stay editable in your database, while history remains a temporary
                scratchpad for recent Playground runs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Open settings
            </Link>
            <Button type="button" size="sm" className="gap-2">
              New collection
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-px border-t border-border/60 bg-border/60 md:grid-cols-3">
        <SummaryCard icon={FolderOpen} label="Collections" value={String(collectionsCount)} />
        <SummaryCard icon={Database} label="Saved Requests" value={String(savedRequestsCount)} />
        <SummaryCard icon={Clock3} label="History Items" value={String(historyCount)} />
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-background/75 px-4 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
