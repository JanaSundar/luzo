export interface FlowPosition {
  readonly x: number;
  readonly y: number;
}

export interface FlowViewportState {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

export interface FlowBlockLike<TType extends string = string, TData = unknown> {
  readonly id: string;
  readonly type: TType;
  readonly position: FlowPosition;
  readonly data: TData;
}

export interface FlowConnectionLike<TKind extends string = string> {
  readonly id: string;
  readonly sourceBlockId: string;
  readonly targetBlockId: string;
  readonly sourceHandleId?: string;
  readonly targetHandleId?: string;
  readonly kind?: TKind;
}

export interface FlowDocumentLike<
  TBlock extends FlowBlockLike = FlowBlockLike,
  TConnection extends FlowConnectionLike = FlowConnectionLike,
> {
  readonly version: number;
  readonly blocks: readonly TBlock[];
  readonly connections: readonly TConnection[];
  readonly viewport?: FlowViewportState;
}
