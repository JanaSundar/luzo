"use client";

import type { BlockDefinition, GroupNode, ListNode, StartNode, TextNode } from "@luzo/flow-types";

import {
  GroupInspector,
  ListInspector,
  StartInspector,
  TextInspector,
} from "../inspectors/BlockInspectors";

export const startBlockDef: BlockDefinition = {
  type: "start",
  minWidth: 164,
  handles: [{ id: "output", position: "right", type: "source" }],
  renderInspector: (node, api) => <StartInspector api={api} node={node as StartNode} />,
};

export const listBlockDef: BlockDefinition = {
  type: "list",
  minWidth: 280,
  handles: [
    { id: "input", position: "left", type: "target" },
    { id: "output", position: "right", type: "source" },
  ],
  renderInspector: (node, api) => <ListInspector api={api} node={node as ListNode} />,
};

export const textBlockDef: BlockDefinition = {
  type: "text",
  minWidth: 280,
  handles: [
    { id: "input", position: "left", type: "target" },
    { id: "output", position: "right", type: "source" },
  ],
  renderInspector: (node, api) => <TextInspector api={api} node={node as TextNode} />,
};

export const groupBlockDef: BlockDefinition = {
  type: "group",
  minWidth: 228,
  handles: [],
  renderInspector: (node, api) => <GroupInspector api={api} node={node as GroupNode} />,
};
