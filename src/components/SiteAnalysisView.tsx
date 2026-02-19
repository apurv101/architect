import type { SiteAnalysis, ZoneType } from "../lib/types";

interface Props {
  siteAnalysis: SiteAnalysis;
}

const ZONE_LABELS: Record<ZoneType, string> = {
  public: "Public Zone",
  private: "Private Zone",
  service: "Service Zone",
};

const ZONE_COLORS: Record<ZoneType, { bg: string; border: string; fill: string }> = {
  public: { bg: "bg-green-50", border: "border-green-300", fill: "#BBF7D0" },
  private: { bg: "bg-blue-50", border: "border-blue-300", fill: "#BFDBFE" },
  service: { bg: "bg-amber-50", border: "border-amber-300", fill: "#FDE68A" },
};

const ZONE_BADGE: Record<ZoneType, string> = {
  public: "bg-green-100 text-green-700",
  private: "bg-blue-100 text-blue-700",
  service: "bg-amber-100 text-amber-700",
};

const EDGE_LABELS: Record<string, string> = {
  top: "Top",
  bottom: "Bottom",
  left: "Left",
  right: "Right",
  center: "Center",
};

const ORIENTATION_LABELS: Record<string, string> = {
  north_top: "North at top",
  north_bottom: "North at bottom",
  north_left: "North at left",
  north_right: "North at right",
};

export default function SiteAnalysisView({ siteAnalysis }: Props) {
  const { plot, zones, siteConstraints, circulationStrategy, entryEdge } = siteAnalysis;
  const roomMap = new Map(siteAnalysis.rooms.map((r) => [r.id, r]));
  const totalArea = siteAnalysis.rooms.reduce((sum, r) => sum + r.targetArea, 0);

  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium mb-3">
          Step 2 of 5 — Site Analysis
        </div>
        <h2 className="text-lg font-semibold text-gray-800">Zoning Strategy</h2>
        <p className="text-sm text-gray-500 mt-1">
          {plot.width} x {plot.height} ft plot &middot; {plot.width * plot.height} sqft &middot; {siteAnalysis.rooms.length} rooms &middot; ~{totalArea} sqft allocated
        </p>
      </div>

      {/* Zone diagram — simple visual */}
      <div className="relative border-2 border-gray-400 rounded-lg overflow-hidden" style={{ minHeight: 180 }}>
        {/* Entry indicator */}
        <div
          className={`absolute z-10 flex items-center justify-center ${
            entryEdge === "top" ? "top-0 left-1/2 -translate-x-1/2" :
            entryEdge === "bottom" ? "bottom-0 left-1/2 -translate-x-1/2" :
            entryEdge === "left" ? "left-0 top-1/2 -translate-y-1/2" :
            "right-0 top-1/2 -translate-y-1/2"
          }`}
        >
          <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
            Entry
          </span>
        </div>

        {/* Zone blocks */}
        <div className="flex flex-col gap-0 h-full" style={{ minHeight: 180 }}>
          {zones.map((zone, i) => (
            <div
              key={i}
              className={`flex-1 p-3 border ${ZONE_COLORS[zone.zone].border} ${ZONE_COLORS[zone.zone].bg}`}
              style={{ minHeight: Math.max(50, zone.region.approximateShare * 1.5) }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${ZONE_BADGE[zone.zone]}`}>
                  {ZONE_LABELS[zone.zone]}
                </span>
                <span className="text-xs text-gray-400">
                  {EDGE_LABELS[zone.region.edge]} &middot; ~{zone.region.approximateShare}%
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {zone.rooms.map((roomId) => {
                  const room = roomMap.get(roomId);
                  return (
                    <span key={roomId} className="px-2 py-0.5 bg-white/70 rounded text-xs text-gray-700 border border-gray-200">
                      {room?.name ?? roomId}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Circulation strategy */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Circulation Strategy</h3>
        <p className="text-sm text-gray-600">{circulationStrategy}</p>
      </div>

      {/* Site constraints */}
      {(siteConstraints.orientation || siteConstraints.setbacks || siteConstraints.preferredWindows?.length) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Site Constraints</h3>
          <div className="space-y-1 text-sm text-gray-600">
            {siteConstraints.orientation && (
              <div>{ORIENTATION_LABELS[siteConstraints.orientation]}</div>
            )}
            {siteConstraints.setbacks && (
              <div>
                Setbacks:{" "}
                {Object.entries(siteConstraints.setbacks)
                  .filter(([, v]) => v && v > 0)
                  .map(([k, v]) => `${k}: ${v}ft`)
                  .join(", ") || "none"}
              </div>
            )}
            {siteConstraints.preferredWindows && siteConstraints.preferredWindows.length > 0 && (
              <div>Preferred windows: {siteConstraints.preferredWindows.join(", ")} edges</div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {siteAnalysis.notes && (
        <p className="text-xs text-gray-400 text-center italic">{siteAnalysis.notes}</p>
      )}
    </div>
  );
}
