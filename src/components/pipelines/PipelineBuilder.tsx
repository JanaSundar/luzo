"use client";

import { useState } from "react";
import { Plus, Workflow } from "lucide-react";
import { motion, Reorder } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePipelineStore } from "@/lib/stores/usePipelineStore";
import { StepCard } from "./StepCard";

export function PipelineBuilder() {
  const {
    pipelines,
    activePipelineId,
    addStep,
    reorderSteps,
    updatePipeline,
    updateStep,
    duplicateStep,
    removeStep,
  } = usePipelineStore();

  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const pipeline = pipelines.find((p) => p.id === activePipelineId);

  if (!pipeline) return null;

  const handleAddRequest = () => {
    addStep(pipeline.id, {
      name: `Request ${pipeline.steps.length + 1}`,
      method: "GET",
      url: "",
      headers: [],
      params: [],
      body: null,
      bodyType: "none",
      auth: { type: "none" },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Pipeline Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{pipeline.name}</h2>
        <Input
          value={pipeline.description || ""}
          onChange={(e) => updatePipeline(pipeline.id, { description: e.target.value })}
          placeholder="Add a description for this pipeline (e.g., Chain requests to authenticate and fetch user profile data.)"
          className="border-none bg-transparent text-muted-foreground text-sm focus-visible:ring-0 px-0 h-8 placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="flex flex-col items-center gap-4">
        {pipeline.steps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center justify-center py-20 gap-6 border-2 border-dashed rounded-2xl bg-muted/5"
          >
            <div className="p-4 rounded-full bg-muted/30">
              <Workflow className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-muted-foreground">
                Build your API pipeline
              </h3>
              <p className="text-sm text-muted-foreground/70 max-w-md">
                Chain multiple API requests that execute sequentially. Reference data from previous
                responses using{" "}
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                  {"{{stepId.response.body.token}}"}
                </code>
              </p>
            </div>
            <Button
              onClick={handleAddRequest}
              className="gap-2 h-10 px-6 bg-foreground text-background hover:bg-foreground/90 font-bold"
            >
              <Plus className="h-4 w-4" />
              Add First Request
            </Button>
          </motion.div>
        ) : (
          <>
            <Reorder.Group
              axis="y"
              values={pipeline.steps}
              onReorder={(newSteps) =>
                reorderSteps(
                  pipeline.id,
                  newSteps.map((s) => s.id)
                )
              }
              className="w-full space-y-6"
            >
              {pipeline.steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  isExpanded={expandedStepId === step.id}
                  onToggleExpand={() =>
                    setExpandedStepId(expandedStepId === step.id ? null : step.id)
                  }
                  onUpdate={(updates) => updateStep(pipeline.id, step.id, updates)}
                  onDuplicate={() => duplicateStep(pipeline.id, step.id)}
                  onDelete={() => removeStep(pipeline.id, step.id)}
                />
              ))}
            </Reorder.Group>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-4">
              <Button
                onClick={handleAddRequest}
                variant="outline"
                className="h-12 px-8 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-all gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Request
              </Button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
