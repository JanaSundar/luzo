"use client";

import { Copy, FileJson, Folder, Plus, Search, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCollectionStore } from "@/lib/stores/useCollectionStore";
import { usePlaygroundStore } from "@/lib/stores/usePlaygroundStore";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/types";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-600",
  POST: "bg-blue-500/15 text-blue-600",
  PUT: "bg-amber-500/15 text-amber-600",
  DELETE: "bg-red-500/15 text-red-600",
  PATCH: "bg-purple-500/15 text-purple-600",
  HEAD: "bg-cyan-500/15 text-cyan-600",
  OPTIONS: "bg-gray-500/15 text-gray-600",
};

export default function CollectionsPage() {
  const {
    collections,
    history,
    createCollection,
    deleteCollection,
    deleteRequest,
    duplicateRequest,
    clearHistory,
  } = useCollectionStore();

  const { setRequest } = usePlaygroundStore();
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [deleteCollId, setDeleteCollId] = useState<string | null>(null);

  const filteredHistory = history.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.request.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r flex flex-col max-h-48 md:max-h-none">
        <div className="p-3 border-b flex items-center justify-between">
          <span className="text-sm font-medium">Collections</span>
          <Dialog>
            <DialogTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent transition-colors">
              <Plus className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Collection</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Collection name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName) {
                      createCollection(newName);
                      setNewName("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newName) {
                      createCollection(newName);
                      setNewName("");
                    }
                  }}
                >
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {collections.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No collections yet</p>
            )}
            {collections.map((coll) => (
              <div
                key={coll.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="flex-1 text-sm truncate">{coll.name}</span>
                <span className="text-xs text-muted-foreground">{coll.requests.length}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hidden group-hover:flex text-destructive"
                  onClick={() => setDeleteCollId(coll.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests..."
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearHistory}>
            Clear History
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            <p className="text-sm font-medium mb-3 text-muted-foreground">
              Recent History ({filteredHistory.length})
            </p>

            {filteredHistory.length === 0 ? (
              <EmptyState
                icon={FileJson}
                title="No requests yet"
                description="Sent requests will appear here"
                action={
                  <Link href="/" className={cn(buttonVariants({ size: "sm" }))}>
                    Open Playground
                  </Link>
                }
              />
            ) : (
              <div className="space-y-1.5">
                {filteredHistory.map((req) => (
                  <button
                    key={req.id}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md border p-2.5 hover:bg-accent/50 cursor-pointer transition-colors text-left"
                    )}
                    type="button"
                    onClick={() => setRequest(req.request)}
                  >
                    <Badge
                      className={cn(
                        "font-mono text-xs font-semibold shrink-0",
                        METHOD_COLORS[req.request.method]
                      )}
                    >
                      {req.request.method}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.name}</p>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {req.request.url}
                      </p>
                    </div>
                    <div className="hidden group-hover:flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateRequest(req.id);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRequest(req.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <ConfirmDialog
        open={Boolean(deleteCollId)}
        onOpenChange={(open) => !open && setDeleteCollId(null)}
        title="Delete collection"
        description="This will delete the collection and all its saved requests."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteCollId) deleteCollection(deleteCollId);
          setDeleteCollId(null);
        }}
      />
    </motion.div>
  );
}
