"use client";

import { TemplateTextarea } from "@/components/ui/template-textarea";
import type { VariableSuggestion } from "@/types/pipeline-debug";
import { FieldLabel, SectionHeading } from "./shared";

export function ScriptsEditor({
  disabled,
  hasVisualRules,
  preRequestScript,
  suggestions,
  testScript,
  onChange,
}: {
  disabled: boolean;
  hasVisualRules: boolean;
  preRequestScript: string;
  suggestions: VariableSuggestion[];
  testScript: string;
  onChange: (
    patch: Partial<{
      preRequestEditorType: "raw";
      preRequestScript: string;
      testEditorType: "raw";
      testScript: string;
    }>,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeading
        title="Scripts"
        description="Use raw script editing directly in the inspector."
      />

      {hasVisualRules ? (
        <p className="text-xs leading-5 text-muted-foreground">
          This step already has visual rules. Editing here switches it to raw script mode while
          keeping the generated script visible.
        </p>
      ) : null}

      <ScriptField
        disabled={disabled}
        id="request-pre-script"
        label="Pre-request"
        placeholder="// Runs before the request"
        suggestions={suggestions}
        value={preRequestScript}
        onChange={(value) =>
          onChange({
            preRequestEditorType: "raw",
            preRequestScript: value,
          })
        }
      />

      <ScriptField
        disabled={disabled}
        id="request-test-script"
        label="Tests"
        placeholder="// Assert on the response here"
        suggestions={suggestions}
        value={testScript}
        onChange={(value) =>
          onChange({
            testEditorType: "raw",
            testScript: value,
          })
        }
      />
    </div>
  );
}

function ScriptField({
  disabled,
  id,
  label,
  onChange,
  placeholder,
  suggestions,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: VariableSuggestion[];
  value: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <TemplateTextarea
        id={id}
        disabled={disabled}
        placeholder={placeholder}
        suggestions={suggestions}
        textareaClassName="min-h-[180px] rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-0 font-mono text-sm shadow-none focus-visible:border-foreground/30 focus-visible:bg-transparent"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
