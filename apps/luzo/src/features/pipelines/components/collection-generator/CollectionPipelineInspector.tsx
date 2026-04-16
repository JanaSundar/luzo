"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PipelineGenerationDraft } from "@/types";

interface CollectionPipelineInspectorProps {
  draft: PipelineGenerationDraft;
  ignoreDependency: (dependencyId: string) => void;
}

export function CollectionPipelineInspector({
  draft,
  ignoreDependency,
}: CollectionPipelineInspectorProps) {
  const suggestedDependencies = draft.dependencies.filter(
    (dependency) => !dependency.applied && !dependency.ignored,
  );
  const unresolved = draft.steps.flatMap((step) => step.unresolved);
  const unresolvedMessages = uniqueLines(unresolved.map((entry) => entry.message));
  const validationMessages = uniqueLines(draft.validation.errors.map((error) => error.message));
  const hasContent =
    suggestedDependencies.length > 0 ||
    unresolvedMessages.length > 0 ||
    validationMessages.length > 0;

  if (!hasContent) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
      {suggestedDependencies.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-background/80 p-3">
          <p className="text-sm font-semibold">Suggestions</p>
          <div className="mt-3 space-y-2">
            {suggestedDependencies.map((dependency) => (
              <div
                key={dependency.id}
                className="rounded-lg border border-border/40 bg-muted/10 p-2"
              >
                <p className="text-sm text-muted-foreground">{dependency.reason}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="mt-2"
                  onClick={() => ignoreDependency(dependency.id)}
                >
                  Ignore suggestion
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {unresolvedMessages.length > 0 ? (
        <SummaryCard title="Needs review" lines={unresolvedMessages} />
      ) : null}

      {validationMessages.length > 0 ? (
        <SummaryCard title="Validation issues" lines={validationMessages} />
      ) : null}
    </div>
  );
}

function SummaryCard({ title, lines }: { lines: string[]; title: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/80 p-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`} className="text-sm text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function uniqueLines(lines: string[]) {
  return Array.from(new Set(lines));
}
