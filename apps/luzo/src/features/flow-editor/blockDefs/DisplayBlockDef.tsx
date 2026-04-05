"use client";

import type { BlockDefinition, DisplayNode } from "@luzo/flow-types";

import { DisplayInspector } from "../inspectors/BlockInspectors";

export const displayBlockDef: BlockDefinition = {
  type: "display",
  minWidth: 286,
  handles: [
    { id: "input", position: "left", type: "target" },
    { id: "output", position: "right", type: "source" },
  ],
  renderInspector: (node, api) => <DisplayInspector api={api} node={node as DisplayNode} />,
};
