import type { FloorPlan, ElevationView } from "../lib/types";
import FloorPlanSVG from "./FloorPlanSVG";
import ElevationViewSVG from "./ElevationViewSVG";
import { useState } from "react";

interface Props {
  floorPlan: FloorPlan | null;
  elevationView: ElevationView | null;
  loading: boolean;
}

type ViewMode = "floor_plan" | "elevation";

export default function FloorPlanPanel({ floorPlan, elevationView, loading }: Props) {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("floor_plan");

  const handleDownload = () => {
    const svgId = viewMode === "elevation" ? "elevation-view-svg" : "floor-plan-svg";
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = viewMode === "elevation" ? "elevation-view.svg" : "floor-plan.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasContent = floorPlan || elevationView;

  return (
    <div className="flex flex-col h-full">
      {/* View toggle (only if both views available) */}
      {floorPlan && elevationView && (
        <div className="flex gap-1 p-2 border-b border-gray-200 bg-white">
          <button
            onClick={() => setViewMode("floor_plan")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === "floor_plan"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Floor Plan
          </button>
          <button
            onClick={() => setViewMode("elevation")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === "elevation"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Elevation View
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4">
        {loading && !hasContent && (
          <div className="text-gray-400 animate-pulse text-lg">Generating floor plan...</div>
        )}
        {!loading && !hasContent && (
          <div className="text-gray-400 text-center px-8">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-lg font-medium">No floor plan yet</p>
            <p className="text-sm mt-1">Describe a floor plan in the chat to get started</p>
          </div>
        )}
        {hasContent && (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
                <span className="text-gray-500 animate-pulse">Updating...</span>
              </div>
            )}
            {viewMode === "elevation" && elevationView ? (
              <ElevationViewSVG elevation={elevationView} zoom={zoom} />
            ) : floorPlan ? (
              <FloorPlanSVG floorPlan={floorPlan} zoom={zoom} />
            ) : null}
          </div>
        )}
      </div>

      {hasContent && (
        <div className="flex items-center gap-2 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Zoom −
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Zoom +
          </button>
          <div className="flex-1" />
          <button
            onClick={handleDownload}
            className="px-3 py-1 text-sm bg-gray-800 text-white hover:bg-gray-700 rounded transition-colors"
          >
            Download SVG
          </button>
        </div>
      )}
    </div>
  );
}
