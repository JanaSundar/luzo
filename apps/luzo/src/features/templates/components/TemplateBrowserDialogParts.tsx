"use client";

import type { TemplateDefinition } from "@/types";
import type { EnvironmentVariable } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateInput } from "@/components/ui/template-input";
import { cn } from "@/utils";
import { buildEnvironmentVariableSuggestions } from "@/utils/variableMetadata";

export function SectionTitle({ label }: { label: string }) {
  return (
    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </p>
  );
}

export function TemplateListButton({
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

export function SimpleInfoCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}

export function TemplateBrowserDetails({
  selectedTemplate,
  values,
  environmentVariables,
  onValueChange,
}: {
  selectedTemplate: TemplateDefinition;
  values: Record<string, string>;
  environmentVariables: EnvironmentVariable[];
  onValueChange: (key: string, value: string) => void;
}) {
  const envSuggestions = buildEnvironmentVariableSuggestions(environmentVariables);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{selectedTemplate.category}</Badge>
          <Badge variant="outline" className="capitalize">
            {selectedTemplate.complexity}
          </Badge>
          <Badge variant="outline">
            {selectedTemplate.sourceType === "builtin" ? "Built-in" : "Saved"}
          </Badge>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-[-0.02em]">{selectedTemplate.name}</h3>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {selectedTemplate.description}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SimpleInfoCard
          title="Includes"
          value={`${selectedTemplate.pipelineDefinition.steps.length} workflow steps`}
        />
        <SimpleInfoCard title="Best For" value={selectedTemplate.category} />
        <SimpleInfoCard
          title="Use Case"
          value={selectedTemplate.tags[0] ?? selectedTemplate.complexity}
        />
      </div>

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
                    onChange={(event) => onValueChange(field.key, event.target.value)}
                  />
                ) : (
                  <TemplateInput
                    id={field.key}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? field.defaultValue ?? ""}
                    suggestions={envSuggestions}
                    onChange={(value) => onValueChange(field.key, value)}
                    inputClassName="h-10 rounded-xl border border-input bg-transparent px-3 py-1 text-sm font-mono"
                    overlayClassName="h-10 rounded-xl border border-input bg-background px-3 py-1 text-sm"
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

      {selectedTemplate.tags.length > 0 ? (
        <div className="rounded-2xl border border-border/50 bg-background p-4">
          <h4 className="text-sm font-semibold">Tags</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTemplate.tags.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="outline" className="bg-background/70">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
