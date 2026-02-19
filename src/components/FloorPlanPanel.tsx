import type { FloorPlan, RoomPlan, SiteAnalysis, BlockingLayout } from "../lib/types";
import FloorPlanSVG from "./FloorPlanSVG";
import RoomPlanView from "./RoomPlanView";
import SiteAnalysisView from "./SiteAnalysisView";
import BlockingLayoutView from "./BlockingLayoutView";
import { useState } from "react";

interface Props {
  floorPlan: FloorPlan | null;
  roomPlan: RoomPlan | null;
  siteAnalysis: SiteAnalysis | null;
  blockingLayout: BlockingLayout | null;
  loading: boolean;
}

export default function FloorPlanPanel({ floorPlan, roomPlan, siteAnalysis, blockingLayout, loading }: Props) {
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

  const hasContent = floorPlan || blockingLayout || siteAnalysis || roomPlan;

  // Determine loading text based on current stage
  const loadingText = floorPlan ? "Updating..." :
    blockingLayout ? "Adding doors & windows..." :
    siteAnalysis ? "Placing rooms..." :
    roomPlan ? "Analyzing site..." :
    "Generating floor plan...";

  return (
    <div className="flex flex-col h-full">
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
        {floorPlan && (
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
                <span className="text-gray-500 animate-pulse">{loadingText}</span>
              </div>
            )}
            <FloorPlanSVG floorPlan={floorPlan} zoom={zoom} />
          </div>
        )}
        {!floorPlan && blockingLayout && (
          <div className="relative w-full flex items-center justify-center">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
                <span className="text-gray-500 animate-pulse">{loadingText}</span>
              </div>
            )}
            <BlockingLayoutView blockingLayout={blockingLayout} />
          </div>
        )}
        {!floorPlan && !blockingLayout && siteAnalysis && (
          <div className="relative w-full">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
                <span className="text-gray-500 animate-pulse">{loadingText}</span>
              </div>
            )}
            <SiteAnalysisView siteAnalysis={siteAnalysis} />
          </div>
        )}
        {!floorPlan && !blockingLayout && !siteAnalysis && roomPlan && (
          <div className="relative w-full">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 rounded">
                <span className="text-gray-500 animate-pulse">{loadingText}</span>
              </div>
            )}
            <RoomPlanView roomPlan={roomPlan} />
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
