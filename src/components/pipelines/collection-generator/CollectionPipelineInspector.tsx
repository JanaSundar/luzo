"use client";

import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
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
  const activeDependencies = draft.dependencies.filter((dependency) => dependency.applied);
  const suggestedDependencies = draft.dependencies.filter(
    (dependency) => !dependency.applied && !dependency.ignored,
  );
  const unresolved = draft.steps.flatMap((step) => step.unresolved);
  const dependencyReasons = uniqueLines(activeDependencies.map((dependency) => dependency.reason));
  const unresolvedMessages = uniqueLines(unresolved.map((entry) => entry.message));
  const validationMessages = uniqueLines(draft.validation.errors.map((error) => error.message));

  const parallelCount = draft.steps.filter((s) => s.grouping === "parallel").length;
  const sequentialCount = draft.steps.filter((s) => s.grouping === "sequential").length;

  // Re-calculate real depth for accurate batch count
  const depthMap = new Map<string, number>();
  for (const id of draft.validation.sortedStepIds) {
    const deps = draft.validation.adjacency[id] ?? [];
    const d =
      deps.length === 0 ? 0 : Math.max(...deps.map((depId) => depthMap.get(depId) ?? 0)) + 1;
    depthMap.set(id, d);
  }
  const batchCount = new Set(Array.from(depthMap.values())).size;

  return (
    <div className="space-y-3">
      <SummaryCard
        icon={Sparkles}
        title="What Luzo inferred"
        lines={[
          `${draft.steps.length} steps ready for pipeline creation`,
          `${parallelCount} parallel and ${sequentialCount} sequential steps`,
          `Auto-recognized ${batchCount} execution ${batchCount === 1 ? "batch" : "batches"}`,
          `${activeDependencies.length} validated dependencies`,
          `${unresolved.length} unresolved variables`,
        ]}
      />

      {activeDependencies.length > 0 ? (
        <SummaryCard icon={CheckCircle2} title="Detected dependencies" lines={dependencyReasons} />
      ) : null}

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

      {unresolved.length > 0 ? (
        <SummaryCard
          icon={AlertTriangle}
          title="Needs review"
          lines={unresolvedMessages}
          tone="warning"
        />
      ) : null}

      {!draft.validation.valid ? (
        <SummaryCard
          icon={AlertTriangle}
          title="Validation issues"
          lines={validationMessages}
          tone="warning"
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  lines,
  tone = "default",
}: {
  icon: typeof Sparkles;
  lines: string[];
  title: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/80 p-3">
      <div className="flex items-center gap-2">
        <Icon className={tone === "warning" ? "h-4 w-4 text-amber-500" : "h-4 w-4 text-primary"} />
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
