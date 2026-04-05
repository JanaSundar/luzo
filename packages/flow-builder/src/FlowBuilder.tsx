import "./theme/tokens.css";
import { EditorStoreProvider } from "./store/editorStore";
import type { FlowBuilderProps } from "./props";
import { Canvas } from "./canvas/Canvas";

export function FlowBuilder(props: FlowBuilderProps) {
  return (
    <EditorStoreProvider>
      <div style={{ height: "100%", minHeight: 0, width: "100%" }}>
        <Canvas {...props} />
      </div>
    </EditorStoreProvider>
  );
}
