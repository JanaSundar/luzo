import { useEffect, useRef } from "react";

interface UseFitViewOnMountOptions {
  enabled?: boolean;
  fitView: () => void;
  ready: boolean;
}

export function useFitViewOnMount({ enabled, fitView, ready }: UseFitViewOnMountOptions) {
  const hasFitViewRunRef = useRef(false);

  useEffect(() => {
    if (!enabled || !ready || hasFitViewRunRef.current) return;
    hasFitViewRunRef.current = true;
    fitView();
  }, [enabled, fitView, ready]);
}
