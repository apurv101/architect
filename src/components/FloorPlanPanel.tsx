import type { FloorPlan } from "../lib/types";
import FloorPlanSVG from "./FloorPlanSVG";
import { useState } from "react";

interface Props {
  floorPlan: FloorPlan | null;
  loading: boolean;
}

export default function FloorPlanPanel({ floorPlan, loading }: Props) {
  const [zoom, setZoom] = useState(1);

  const handleDownload = () => {
    const svg = document.getElementById("floor-plan-svg");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "floor-plan.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 p-4">
        {loading && !floorPlan && (
          <div className="text-gray-400 animate-pulse text-lg">Generating floor plan...</div>
        )}
        {!loading && !floorPlan && (
          <div className="text-gray-400 text-center px-8">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-lg font-medium">No floor plan yet</p>
            <p className="text-sm mt-1">Describe a floor plan in the chat to get started</p>
          </div>
        )}
        {floorPlan && (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
                <span className="text-gray-500 animate-pulse">Updating...</span>
              </div>
            )}
            <FloorPlanSVG floorPlan={floorPlan} zoom={zoom} />
          </div>
        )}
      </div>

      {floorPlan && (
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
