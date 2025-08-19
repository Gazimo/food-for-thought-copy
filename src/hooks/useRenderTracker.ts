import { useEffect, useRef } from "react";
import { performanceMonitor } from "../utils/performance";

export function useRenderTracker(componentName: string, props?: any) {
  const renderStartTime = useRef<number | undefined>(undefined);
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderStartTime.current = performance.now();
  });

  useEffect(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      renderCount.current++;

      let reason = "initial";
      if (renderCount.current > 1) {
        reason = "props change";
        if (props && prevProps.current) {
          const changedProps = Object.keys(props).filter(
            (key) => props[key] !== prevProps.current[key]
          );
          if (changedProps.length > 0) {
            reason = `props: ${changedProps.join(", ")}`;
          }
        }
      }

      performanceMonitor.logRender(componentName, renderTime, props, reason);
      prevProps.current = props;
    }
  });

  return renderCount.current;
}
