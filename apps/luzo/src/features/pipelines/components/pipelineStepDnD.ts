/** MIME type for HTML5 drag-and-drop of pipeline steps (native DnD, no motion/layout). */
// export const PIPELINE_STEP_DRAG_TYPE = "application/x-luzo-pipeline-step-id";

export function reorderStepIds(ids: string[], fromIndex: number, toIndex: number): string[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= ids.length ||
    toIndex >= ids.length
  ) {
    return ids;
  }
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return ids;
  next.splice(toIndex, 0, moved);
  return next;
}
