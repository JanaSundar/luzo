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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SectionTitle,
  TemplateBrowserDetails,
  TemplateListButton,
} from "./TemplateBrowserDialogParts";

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
                <TemplateBrowserDetails
                  selectedTemplate={selectedTemplate}
                  values={values}
                  environmentVariables={environmentVariables}
                  onValueChange={(key, value) =>
                    setValues((current) => ({ ...current, [key]: value }))
                  }
                />
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
