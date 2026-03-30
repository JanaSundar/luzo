"use client";

import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { BUILTIN_TEMPLATES } from "@/features/templates/builtins";
import { instantiateTemplate } from "@/features/templates/instantiate-template";
import { useTemplatesQuery } from "@/features/templates/useTemplates";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { TemplateDefinition } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateInput } from "@/components/ui/template-input";
import { cn } from "@/utils";
import { buildEnvironmentVariableSuggestions } from "@/utils/variableMetadata";

export function TemplateBrowserDialog({
  trigger,
  className,
}: {
  trigger?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    BUILTIN_TEMPLATES[0]?.id ?? "",
  );
  const [values, setValues] = useState<Record<string, string>>({});
  const { data: userTemplates = [] } = useTemplatesQuery();
  const environments = useEnvironmentStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentStore((state) => state.activeEnvironmentId);
  const insertPipeline = usePipelineStore((state) => state.insertPipeline);
  const updatePipeline = usePipelineStore((state) => state.updatePipeline);
  const setView = usePipelineStore((state) => state.setView);
  const activePipeline = usePipelineStore(
    (state) => state.pipelines.find((pipeline) => pipeline.id === state.activePipelineId) ?? null,
  );
  const dbConnected = useSettingsStore(
    (state) => state.dbStatus === "connected" && state.dbSchemaReady,
  );

  const templates = useMemo(
    () => [...BUILTIN_TEMPLATES, ...(dbConnected ? userTemplates : [])],
    [dbConnected, userTemplates],
  );
  const environmentVariables = useMemo(() => {
    const activeEnvironment = environments.find(
      (environment) => environment.id === activeEnvironmentId,
    );
    return activeEnvironment?.variables.filter((variable) => variable.enabled) ?? [];
  }, [activeEnvironmentId, environments]);
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null;
  const envSuggestions = useMemo(
    () => buildEnvironmentVariableSuggestions(environmentVariables),
    [environmentVariables],
  );

  const handleInstantiate = () => {
    if (!selectedTemplate) return;
    const missing = selectedTemplate.inputSchema.filter(
      (field) => field.required && !(values[field.key] ?? field.defaultValue ?? "").trim(),
    );
    if (missing.length > 0) {
      toast.error(
        `Fill ${missing[0]?.label ?? "all required fields"} before creating the template.`,
      );
      return;
    }

    const resolvedValues = Object.fromEntries(
      selectedTemplate.inputSchema.map((field) => [
        field.key,
        values[field.key] ?? field.defaultValue ?? "",
      ]),
    );
    const pipeline = instantiateTemplate(selectedTemplate, resolvedValues);

    if (
      activePipeline &&
      activePipeline.steps.length === 0 &&
      !activePipeline.description?.trim()
    ) {
      updatePipeline(activePipeline.id, {
        name: pipeline.name,
        description: pipeline.description,
        flowDocument: pipeline.flowDocument,
        steps: pipeline.steps,
      });
    } else {
      insertPipeline(pipeline);
    }

    setView("builder");
    setOpen(false);
    setValues({});
    toast.success(`${selectedTemplate.name} added to your workspace`);
  };

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

        <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[300px_minmax(0,1fr)]">
          <ScrollArea className="min-h-0 border-r border-border/50">
            <div className="space-y-3 p-4">
              <SectionTitle label="Built-in" />
              {BUILTIN_TEMPLATES.map((template) => (
                <TemplateListButton
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplate?.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                />
              ))}
              {dbConnected && userTemplates.length > 0 ? (
                <>
                  <SectionTitle label="My Templates" />
                  {userTemplates.map((template) => (
                    <TemplateListButton
                      key={template.id}
                      template={template}
                      isSelected={template.id === selectedTemplate?.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                    />
                  ))}
                </>
              ) : null}
            </div>
          </ScrollArea>

          <div className="min-h-0 overflow-hidden p-6">
            {selectedTemplate ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-border/50 bg-[linear-gradient(135deg,rgba(15,23,42,0.03),rgba(59,130,246,0.07))] p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{selectedTemplate.category}</Badge>
                        <Badge variant="outline" className="capitalize">
                          {selectedTemplate.complexity}
                        </Badge>
                        <Badge variant="outline">
                          {selectedTemplate.sourceType === "builtin" ? "Built-in" : "Saved"}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                        {selectedTemplate.name}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {selectedTemplate.description}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="space-y-4">
                        {selectedTemplate.inputSchema.length > 0 ? (
                          <div className="rounded-2xl border border-border/50 bg-background p-4">
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold">Inputs</h4>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Only the values needed to start this workflow.
                              </p>
                            </div>
                            <div className="grid gap-3">
                              {selectedTemplate.inputSchema.map((field) => (
                                <div key={field.key} className="grid gap-1.5">
                                  <Label htmlFor={field.key}>
                                    {field.label}
                                    {field.required ? " *" : ""}
                                  </Label>
                                  {field.secret ? (
                                    <Input
                                      id={field.key}
                                      type="password"
                                      placeholder={field.placeholder}
                                      value={values[field.key] ?? field.defaultValue ?? ""}
                                      onChange={(event) =>
                                        setValues((current) => ({
                                          ...current,
                                          [field.key]: event.target.value,
                                        }))
                                      }
                                    />
                                  ) : (
                                    <TemplateInput
                                      id={field.key}
                                      placeholder={field.placeholder}
                                      value={values[field.key] ?? field.defaultValue ?? ""}
                                      suggestions={envSuggestions}
                                      onChange={(value) =>
                                        setValues((current) => ({
                                          ...current,
                                          [field.key]: value,
                                        }))
                                      }
                                      inputClassName="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono"
                                      overlayClassName="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-border/50 bg-background p-4">
                            <h4 className="text-sm font-semibold">Ready to Use</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              This template does not need any setup before creating the pipeline.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <SimpleInfoCard
                          title="Includes"
                          value={`${selectedTemplate.pipelineDefinition.steps.length} workflow steps`}
                        />
                        <SimpleInfoCard title="Best For" value={selectedTemplate.category} />
                        {selectedTemplate.tags.length > 0 ? (
                          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                            <h4 className="text-sm font-semibold">Tags</h4>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedTemplate.tags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="outline" className="bg-background/70">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex shrink-0 justify-end border-t border-border/50 pt-4">
                  <Button type="button" onClick={handleInstantiate} className="min-w-36">
                    Create Pipeline
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No templates available.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </p>
  );
}

function TemplateListButton({
  template,
  isSelected,
  onClick,
}: {
  template: TemplateDefinition;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{template.name}</span>
        <Badge variant={template.sourceType === "builtin" ? "secondary" : "outline"}>
          {template.sourceType === "builtin" ? "Built-in" : "Saved"}
        </Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{template.pipelineDefinition.steps.length} steps</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <span className="capitalize">{template.complexity}</span>
      </div>
    </button>
  );
}

function SimpleInfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}
