export type HandleType = "source" | "target";

export type HandlePosition = "top" | "right" | "bottom" | "left";

export type HandleId = "input" | "output" | "success" | "fail" | "true" | "false" | (string & {});

export interface Handle {
  id: HandleId;
  type: HandleType;
  position: HandlePosition;
  label?: string;
}
