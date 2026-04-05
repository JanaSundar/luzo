"use client";

import { Braces, WandSparkles } from "lucide-react";
import type { ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { importCurlToRequest } from "@/lib/utils/curl-import";
import type { ApiRequest } from "@/types";
export function ImportCurlDialog({
  onImport,
  trigger,
}: {
  onImport: (request: ApiRequest) => void;
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");

  const handleImport = async () => {
    try {
      onImport(importCurlToRequest(source));
      toast.success("Request imported");
      setSource("");
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to import");
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 rounded-lg border-border/40 bg-background px-2.5 text-sm font-medium"
            >
              <Braces className="h-3.5 w-3.5" />
              <span>cURL</span>
            </Button>
          )
        }
      />
      <DialogContent className="flex max-h-[min(88dvh,760px)] flex-col sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-3">
          <DialogTitle>Import cURL</DialogTitle>
          <DialogDescription>Paste a cURL command to turn it into a request.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <Textarea
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder={`curl 'https://api.example.com/users' -X POST -H 'Content-Type: application/json' --data '{"name":"Ada"}'`}
            className="field-sizing-fixed h-full min-h-[240px] max-h-full resize-none overflow-y-auto rounded-xl font-mono text-[13px] leading-6"
          />
        </div>

        <DialogFooter className="shrink-0">
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            className="gap-2"
            onClick={() => void handleImport()}
            disabled={!source.trim()}
          >
            <WandSparkles className="h-4 w-4" />
            Import request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
