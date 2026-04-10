export type ValidationSeverity = "error" | "warning";

export type ValidationIssueCode =
  | "duplicate-block-id"
  | "duplicate-connection-id"
  | "missing-source-block"
  | "missing-target-block"
  | "cycle-detected"
  | "missing-start-block"
  | "multiple-start-blocks"
  | "start-has-incoming-edge"
  | "unreachable-block";

export interface ValidationIssue {
  readonly code: ValidationIssueCode;
  readonly severity: ValidationSeverity;
  readonly message: string;
  readonly blockId?: string;
  readonly connectionId?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
  readonly derived?: {
    readonly topoOrder: readonly string[];
  };
}
