"use client";

import { useState } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TemplateBrowserPanel } from "./TemplateBrowserPanel";

export function TemplateBrowserDialog({
  trigger,
  className,
}: {
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" className={className} />}>
        {trigger ?? (
          <>
            <PlusCircle className="h-4 w-4" />
            Use Built-in Template
          </>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[min(88dvh,780px)] max-w-5xl flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader>
          <div className="border-b border-border/50 bg-muted/20 px-6 py-5">
            <DialogTitle>Template Browser</DialogTitle>
            <DialogDescription className="mt-1">
              Pick a starting workflow, fill a few inputs, and Luzo will create the pipeline for
              you.
            </DialogDescription>
          </div>
        </DialogHeader>

        <TemplateBrowserPanel onApplied={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
