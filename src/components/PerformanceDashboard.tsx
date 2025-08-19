"use client";

import { debugPerformance } from "@/utils/performance";
import { useEffect, useState } from "react";

interface PerformanceStats {
  totalRenders: number;
  recentRenders: number;
  totalStateChanges: number;
  recentStateChanges: number;
  componentStats: Array<{
    component: string;
    totalRenders: number;
    recentRenders: number;
    avgRenderTime: number;
  }>;
  slowestRenders: Array<{
    componentName: string;
    renderTime: number;
    reason?: string;
    timestamp: number;
  }>;
}

export function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isVisible || !autoRefresh) return;

    const interval = setInterval(() => {
      setStats(debugPerformance.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, autoRefresh]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
        >
          📊 Performance
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Performance Monitor</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2 py-1 rounded text-xs ${
              autoRefresh
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {autoRefresh ? "🔄 Auto" : "⏸️ Paused"}
          </button>
          <button
            onClick={() => setStats(debugPerformance.getStats())}
            className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => {
              debugPerformance.clearLogs();
              setStats(null);
            }}
            className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200"
          >
            🗑️ Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      {stats && (
        <div className="space-y-3">
          {/* Overall Stats */}
          <div className="bg-gray-50 p-2 rounded">
            <h4 className="font-medium text-xs mb-1">Overall Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Total Renders: {stats.totalRenders}</div>
              <div>Recent (30s): {stats.recentRenders}</div>
              <div>State Changes: {stats.totalStateChanges}</div>
              <div>Recent (30s): {stats.recentStateChanges}</div>
            </div>
          </div>

          {/* Component Stats */}
          <div className="bg-blue-50 p-2 rounded">
            <h4 className="font-medium text-xs mb-1">Component Renders</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {stats.componentStats.slice(0, 8).map((component, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="truncate">{component.component}</span>
                  <span className="text-gray-600 ml-2">
                    {component.totalRenders} (
                    {component.avgRenderTime.toFixed(1)}ms avg)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Slowest Renders */}
          {stats.slowestRenders.length > 0 && (
            <div className="bg-red-50 p-2 rounded">
              <h4 className="font-medium text-xs mb-1">Slowest Renders</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {stats.slowestRenders.slice(0, 5).map((render, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between">
                      <span className="truncate">{render.componentName}</span>
                      <span className="text-red-600 ml-2">
                        {render.renderTime.toFixed(1)}ms
                      </span>
                    </div>
                    {render.reason && (
                      <div className="text-gray-500 text-xs truncate">
                        {render.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-2 border-t text-xs text-gray-500">
        <div>Press Ctrl+Shift+P to toggle</div>
        <div>Console: debugPerformance.printSummary()</div>
      </div>
    </div>
  );
}
