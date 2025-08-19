/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  enabled: process.env.NODE_ENV === "development",
  logRenders: true,
  logRenderTimes: true,
  trackStateChanges: true,
  maxLogEntries: 100,
};

// Performance data storage
interface RenderLog {
  componentName: string;
  timestamp: number;
  renderTime: number;
  props: any;
  reason?: string;
}

interface StateChangeLog {
  action: string;
  timestamp: number;
  stateBefore: any;
  stateAfter: any;
  duration: number;
}

class PerformanceMonitor {
  private renderLogs: RenderLog[] = [];
  private stateChangeLogs: StateChangeLog[] = [];
  private renderCounts: Map<string, number> = new Map();

  logRender(
    componentName: string,
    renderTime: number,
    props: any,
    reason?: string
  ) {
    if (!PERFORMANCE_CONFIG.enabled || !PERFORMANCE_CONFIG.logRenders) return;

    const log: RenderLog = {
      componentName,
      timestamp: Date.now(),
      renderTime,
      props: this.sanitizeProps(props),
      reason,
    };

    this.renderLogs.push(log);
    this.renderCounts.set(
      componentName,
      (this.renderCounts.get(componentName) || 0) + 1
    );

    // Keep only recent logs
    if (this.renderLogs.length > PERFORMANCE_CONFIG.maxLogEntries) {
      this.renderLogs = this.renderLogs.slice(
        -PERFORMANCE_CONFIG.maxLogEntries
      );
    }

    // Log to console with color coding
    const count = this.renderCounts.get(componentName);
    console.log(
      `%c🔄 ${componentName} #${count}`,
      "color: #3b82f6; font-weight: bold",
      {
        renderTime: `${renderTime.toFixed(2)}ms`,
        reason: reason || "unknown",
        props: this.sanitizeProps(props),
      }
    );
  }

  logStateChange(
    action: string,
    stateBefore: any,
    stateAfter: any,
    duration: number
  ) {
    if (!PERFORMANCE_CONFIG.enabled || !PERFORMANCE_CONFIG.trackStateChanges)
      return;

    const log: StateChangeLog = {
      action,
      timestamp: Date.now(),
      stateBefore: this.sanitizeState(stateBefore),
      stateAfter: this.sanitizeState(stateAfter),
      duration,
    };

    this.stateChangeLogs.push(log);

    // Keep only recent logs
    if (this.stateChangeLogs.length > PERFORMANCE_CONFIG.maxLogEntries) {
      this.stateChangeLogs = this.stateChangeLogs.slice(
        -PERFORMANCE_CONFIG.maxLogEntries
      );
    }

    console.log(`%c⚡ State: ${action}`, "color: #10b981; font-weight: bold", {
      duration: `${duration.toFixed(2)}ms`,
      changes: this.getStateChanges(stateBefore, stateAfter),
    });
  }

  getStats() {
    const now = Date.now();
    const last30Seconds = now - 30000;

    const recentRenders = this.renderLogs.filter(
      (log) => log.timestamp > last30Seconds
    );
    const recentStateChanges = this.stateChangeLogs.filter(
      (log) => log.timestamp > last30Seconds
    );

    const componentStats = Array.from(this.renderCounts.entries())
      .map(([name, count]) => ({
        component: name,
        totalRenders: count,
        recentRenders: recentRenders.filter((log) => log.componentName === name)
          .length,
        avgRenderTime: this.getAverageRenderTime(name),
      }))
      .sort((a, b) => b.totalRenders - a.totalRenders);

    return {
      totalRenders: this.renderLogs.length,
      recentRenders: recentRenders.length,
      totalStateChanges: this.stateChangeLogs.length,
      recentStateChanges: recentStateChanges.length,
      componentStats,
      slowestRenders: this.renderLogs
        .sort((a, b) => b.renderTime - a.renderTime)
        .slice(0, 10),
    };
  }

  private sanitizeProps(props: any): any {
    try {
      return JSON.parse(
        JSON.stringify(props, (key, value) => {
          if (typeof value === "function") return "[Function]";
          if (value instanceof HTMLElement) return "[HTMLElement]";
          return value;
        })
      );
    } catch {
      return "[Complex Object]";
    }
  }

  private sanitizeState(state: any): any {
    try {
      return JSON.parse(
        JSON.stringify(state, (key, value) => {
          if (typeof value === "function") return "[Function]";
          if (key === "currentDish" && value) return "[Dish Object]";
          return value;
        })
      );
    } catch {
      return "[Complex State]";
    }
  }

  private getStateChanges(before: any, after: any): string[] {
    const changes: string[] = [];

    try {
      const beforeKeys = Object.keys(before || {});
      const afterKeys = Object.keys(after || {});

      const allKeys = new Set([...beforeKeys, ...afterKeys]);

      for (const key of allKeys) {
        if (before[key] !== after[key]) {
          changes.push(key);
        }
      }
    } catch {
      changes.push("unknown");
    }

    return changes;
  }

  private getAverageRenderTime(componentName: string): number {
    const renders = this.renderLogs.filter(
      (log) => log.componentName === componentName
    );
    if (renders.length === 0) return 0;

    const total = renders.reduce((sum, log) => sum + log.renderTime, 0);
    return total / renders.length;
  }

  printSummary() {
    if (!PERFORMANCE_CONFIG.enabled) return;

    const stats = this.getStats();

    console.group(
      "%c📊 Performance Summary",
      "color: #8b5cf6; font-weight: bold; font-size: 16px"
    );

    console.log("%cOverall Stats:", "color: #6b7280; font-weight: bold");
    console.table({
      "Total Renders": stats.totalRenders,
      "Recent Renders (30s)": stats.recentRenders,
      "Total State Changes": stats.totalStateChanges,
      "Recent State Changes (30s)": stats.recentStateChanges,
    });

    console.log(
      "%cComponent Render Counts:",
      "color: #6b7280; font-weight: bold"
    );
    console.table(stats.componentStats);

    if (stats.slowestRenders.length > 0) {
      console.log("%cSlowest Renders:", "color: #ef4444; font-weight: bold");
      console.table(
        stats.slowestRenders.map((log) => ({
          Component: log.componentName,
          "Render Time": `${log.renderTime.toFixed(2)}ms`,
          Reason: log.reason || "unknown",
          Timestamp: new Date(log.timestamp).toLocaleTimeString(),
        }))
      );
    }

    console.groupEnd();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Hook to track component renders
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

// Hook to track state changes
export function useStateChangeTracker() {
  return {
    trackStateChange: (
      action: string,
      stateBefore: any,
      stateAfter: any,
      duration: number
    ) => {
      performanceMonitor.logStateChange(
        action,
        stateBefore,
        stateAfter,
        duration
      );
    },
  };
}

// Hook to track expensive operations
export function usePerformanceTimer(operationName: string) {
  const startTime = useRef<number | undefined>(undefined);

  const start = () => {
    startTime.current = performance.now();
  };

  const end = () => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      console.log(
        `%c⏱️ ${operationName}`,
        "color: #f59e0b; font-weight: bold",
        `${duration.toFixed(2)}ms`
      );
      return duration;
    }
    return 0;
  };

  return { start, end };
}

// Debug utilities
export const debugPerformance = {
  printSummary: () => performanceMonitor.printSummary(),
  getStats: () => performanceMonitor.getStats(),
  clearLogs: () => {
    performanceMonitor["renderLogs"] = [];
    performanceMonitor["stateChangeLogs"] = [];
    performanceMonitor["renderCounts"].clear();
  },
};

// Make debug utilities available globally in development
if (typeof window !== "undefined" && PERFORMANCE_CONFIG.enabled) {
  (window as any).debugPerformance = debugPerformance;
}
