import type { ReactNode } from "react";
import type { BlockRegistry, SuggestionDropParams, SuggestionSource } from "@luzo/flow-types";

import { MenuSurface } from "./MenuSurface";

interface SuggestionMenuProps {
  anchor: { x: number; y: number };
  anchorEdge?: "top" | "bottom";
  blockRegistry: BlockRegistry;
  close: () => void;
  params: SuggestionDropParams;
  renderSuggestionMenu?: (params: SuggestionDropParams, close: () => void) => ReactNode;
  suggestionSources?: SuggestionSource[];
}

export function SuggestionMenu({
  anchor,
  anchorEdge,
  blockRegistry,
  close,
  params,
  renderSuggestionMenu,
  suggestionSources,
}: SuggestionMenuProps) {
  const items =
    suggestionSources?.flatMap((source) => source.items) ??
    Object.keys(blockRegistry).map((type) => ({ label: type, type }));

  return (
    <MenuSurface anchor={anchor} onClose={close} {...(anchorEdge ? { anchorEdge } : {})}>
      {renderSuggestionMenu ? (
        renderSuggestionMenu(params, close)
      ) : (
        <>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              opacity: 0.6,
              padding: "4px 8px",
              textTransform: "uppercase",
            }}
          >
            Add block
          </div>
          {items.map((item) => (
            <button
              key={`${item.type}:${item.label}`}
              type="button"
              onClick={close}
              style={{
                alignItems: "flex-start",
                background: "transparent",
                border: 0,
                borderRadius: 10,
                cursor: "pointer",
                display: "flex",
                padding: "10px 12px",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span>{item.label}</span>
            </button>
          ))}
        </>
      )}
    </MenuSurface>
  );
}
