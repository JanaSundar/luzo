const VIEWPORT_MARGIN = 8;

export type TemplateMenuPosition = {
  left: number;
  maxHeight: number;
  maxWidth: string;
  position: "fixed";
  top: number;
  width: number;
  zIndex: number;
};

export const DEFAULT_TEMPLATE_MENU_POSITION: TemplateMenuPosition = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 240,
  maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
  maxHeight: 320,
  zIndex: 9999,
};

export function getTemplateMenuPosition(rect: DOMRect): TemplateMenuPosition {
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  const maxAllowedHeight = Math.floor(viewportHeight * 0.25);
  const preferredMaxHeight = Math.max(160, Math.min(320, maxAllowedHeight));

  const width = Math.min(Math.max(rect.width, 240), viewportWidth - VIEWPORT_MARGIN * 2);

  const availableBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
  const availableAbove = rect.top - VIEWPORT_MARGIN;

  // Decide whether to show above or below based on available space and preferred height
  const showAbove = availableBelow < preferredMaxHeight && availableAbove > availableBelow;

  const maxHeight = Math.min(preferredMaxHeight, showAbove ? availableAbove : availableBelow);

  const top = showAbove
    ? Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - 4)
    : Math.min(viewportHeight - VIEWPORT_MARGIN - maxHeight, rect.bottom + 4);

  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rect.left),
    viewportWidth - VIEWPORT_MARGIN - width,
  );

  return {
    ...DEFAULT_TEMPLATE_MENU_POSITION,
    top,
    left,
    width,
    maxHeight,
  };
}
