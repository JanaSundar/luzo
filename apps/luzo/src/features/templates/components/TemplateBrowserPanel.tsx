"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { BUILTIN_TEMPLATES } from "@/features/templates/builtins";
import { instantiateTemplate } from "@/features/templates/instantiate-template";
import { filterTemplates } from "@/features/templates/template-utils";
import { useTemplatesQuery } from "@/features/templates/useTemplates";
import { applyGeneratedPipeline } from "@/features/workflow-starter/apply-generated-pipeline";
import { useEnvironmentStore } from "@/stores/useEnvironmentStore";
import { usePipelineStore } from "@/stores/usePipelineStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SectionTitle,
  TemplateBrowserDetails,
  TemplateListButton,
} from "./TemplateBrowserDialogParts";

export function TemplateBrowserPanel({
  onApplied,
}: {
  onApplied?: (templateName: string) => void;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    BUILTIN_TEMPLATES[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [complexity, setComplexity] = useState<"all" | "starter" | "intermediate" | "advanced">(
    "all",
  );
  const [tag, setTag] = useState("all");
  const [values, setValues] = useState<Record<string, string>>({});
  const { data: userTemplates = [] } = useTemplatesQuery();
  const environments = useEnvironmentStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentStore((state) => state.activeEnvironmentId);
  const insertPipeline = usePipelineStore((state) => state.insertPipeline);
  const setSelectedNodeId = usePipelineStore((state) => state.setSelectedNodeId);
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
  const categories = useMemo(
    () => ["all", ...new Set(templates.map((template) => template.category).sort())],
    [templates],
  );
  const tags = useMemo(
    () => ["all", ...new Set(templates.flatMap((template) => template.tags).sort())],
    [templates],
  );
  const filteredTemplates = useMemo(
    () => filterTemplates(templates, { category, complexity, search, tag }),
    [category, complexity, search, tag, templates],
  );
  const recommendedTemplates = useMemo(() => {
    if (search || category !== "all" || complexity !== "all" || tag !== "all") {
      return [];
    }
    return templates
      .filter((template) => template.sourceType === "builtin" || template.complexity === "starter")
      .slice(0, 3);
  }, [category, complexity, search, tag, templates]);
  const environmentVariables = useMemo(() => {
    const activeEnvironment = environments.find(
      (environment) => environment.id === activeEnvironmentId,
    );
    return activeEnvironment?.variables.filter((variable) => variable.enabled) ?? [];
  }, [activeEnvironmentId, environments]);
  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ??
    filteredTemplates[0] ??
    null;
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    applyGeneratedPipeline({
      activePipeline,
      generatedPipeline: pipeline,
      insertPipeline,
      setSelectedNodeId,
      setView,
      updatePipeline,
    });
    setValues({});
    onApplied?.(selectedTemplate.name);
    toast.success(`${selectedTemplate.name} added to your workspace`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-border/60 bg-background/80 shadow-sm">
      <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Template
          </p>
          <div className="space-y-2">
            <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-[2rem]">
              Pick a workflow pattern and adapt it.
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Choose a starter, fill only the inputs it needs, and create the pipeline directly.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search templates"
              className="h-10 border-border/60 bg-muted/10 pl-9"
            />
          </div>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-muted/10 px-4 py-3 text-left">
              <span>
                <span className="block text-sm font-medium text-foreground">Filters</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Category, complexity, and tags
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3 pt-3 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Category
                  </Label>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {categories.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry === "all" ? "All categories" : entry}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Complexity
                  </Label>
                  <select
                    value={complexity}
                    onChange={(event) => setComplexity(event.target.value as typeof complexity)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">All complexities</option>
                    <option value="starter">Starter</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Tag
                  </Label>
                  <select
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    {tags.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry === "all" ? "All tags" : entry}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <ScrollArea className="h-[min(34dvh,320px)] rounded-2xl border border-border/60 bg-muted/10">
          <div className="space-y-4 p-4">
            {recommendedTemplates.length > 0 ? (
              <>
                <SectionTitle label="Recommended" />
                {recommendedTemplates.map((template) => (
                  <TemplateListButton
                    key={template.id}
                    template={template}
                    isSelected={template.id === selectedTemplate?.id}
                    onClick={() => setSelectedTemplateId(template.id)}
                  />
                ))}
              </>
            ) : null}

            {filteredTemplates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                No templates match the current filters.
              </div>
            ) : null}

            {filteredTemplates.some((template) => template.sourceType === "builtin") ? (
              <>
                <SectionTitle label="Built-in" />
                {filteredTemplates
                  .filter((template) => template.sourceType === "builtin")
                  .map((template) => (
                    <TemplateListButton
                      key={template.id}
                      template={template}
                      isSelected={template.id === selectedTemplate?.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                    />
                  ))}
              </>
            ) : null}
            {filteredTemplates.some((template) => template.sourceType === "user") ? (
              <>
                <SectionTitle label="My Templates" />
                {filteredTemplates
                  .filter((template) => template.sourceType === "user")
                  .map((template) => (
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

        {selectedTemplate ? (
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
            <TemplateBrowserDetails
              selectedTemplate={selectedTemplate}
              values={values}
              environmentVariables={environmentVariables}
              onValueChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
            />
          </div>
        ) : null}
      </div>

      <div className="border-t border-border/50 bg-background/90 px-6 py-4 md:px-8">
        <Button type="button" onClick={handleInstantiate}>
          Create pipeline
        </Button>
      </div>
    </div>
  );
}
