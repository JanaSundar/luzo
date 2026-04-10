export type HandleType = "source" | "target";

export type HandlePosition = "top" | "right" | "bottom" | "left";

export type HandleId = "input" | "output" | "success" | "fail" | "true" | "false" | (string & {});

/**
 * Canonical handle kind vocabulary — locked in Phase 1.
 * `loop_body` / `loop_exit` are reserved for loop-style nodes.
 */
export type HandleKind =
  | "success"
  | "failure"
  | "true"
  | "false"
  | "default"
  | "loop_body"
  | "loop_exit";

export interface Handle {
  id: HandleId;
  type: HandleType;
  position: HandlePosition;
  label?: string;
}
