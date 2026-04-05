const VIEWPORT_MARGIN = 8;
const DEFAULT_MENU_MAX_HEIGHT = 320;

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
  maxHeight: DEFAULT_MENU_MAX_HEIGHT,
  zIndex: 9999,
};

export function getTemplateMenuPosition(rect: DOMRect): TemplateMenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(Math.max(rect.width, 240), viewportWidth - VIEWPORT_MARGIN * 2);
  const availableBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
  const availableAbove = rect.top - VIEWPORT_MARGIN;
  const showAbove = availableBelow < 180 && availableAbove > availableBelow;
  const maxHeight = Math.max(
    160,
    Math.min(DEFAULT_MENU_MAX_HEIGHT, showAbove ? availableAbove - 4 : availableBelow - 4),
  );
  const top = showAbove
    ? Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - 4)
    : Math.min(viewportHeight - VIEWPORT_MARGIN - maxHeight, rect.bottom + 4);
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rect.left),
    viewportWidth - VIEWPORT_MARGIN - width,
  );

  return { ...DEFAULT_TEMPLATE_MENU_POSITION, top, left, width, maxHeight };
}
