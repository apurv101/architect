import type { FloorPlan } from "../lib/types";
import type { FurnitureType } from "../lib/types";
import RoomRect, { SCALE } from "./RoomRect";
import DoorMarker from "./DoorMarker";
import FurnitureRect from "./FurnitureRect";
import WallRenderer from "./WallRenderer";
import WindowMarker from "./WindowMarker";
import DimensionLines from "./DimensionLines";
import ElectricalOverlay from "./ElectricalOverlay";
import PlumbingOverlay from "./PlumbingOverlay";
import LightingOverlay from "./LightingOverlay";
import HVACOverlay from "./HVACOverlay";
import LandscapingOverlay from "./LandscapingOverlay";
import StaircaseMarker from "./StaircaseMarker";
import ElevatorMarker from "./ElevatorMarker";
import AnnotationOverlay from "./AnnotationOverlay";
import { furnitureColors } from "../lib/colors";

interface Props {
  floorPlan: FloorPlan;
  zoom: number;
}

/** Deduplicate furniture types for the legend */
function uniqueTypes(items: { type: FurnitureType; name: string }[]): { type: FurnitureType; name: string }[] {
  const seen = new Set<FurnitureType>();
  const result: { type: FurnitureType; name: string }[] = [];
  for (const item of items) {
    if (!seen.has(item.type)) {
      seen.add(item.type);
      result.push(item);
    }
  }
  return result;
}

export default function FloorPlanSVG({ floorPlan, zoom }: Props) {
  const { plot, rooms, doors } = floorPlan;
  const furniture = floorPlan.furniture ?? [];
  const windows = floorPlan.windows ?? [];
  const electrical = floorPlan.electrical ?? [];
  const plumbing = floorPlan.plumbing ?? [];
  const plumbingRuns = floorPlan.plumbingRuns ?? [];
  const lighting = floorPlan.lighting ?? [];
  const hvac = floorPlan.hvac ?? [];
  const ductRuns = floorPlan.ductRuns ?? [];
  const landscaping = floorPlan.landscaping ?? [];
  const staircases = floorPlan.staircases ?? [];
  const elevators = floorPlan.elevators ?? [];
  const annotations = floorPlan.annotations ?? [];
  const padding = 60;

  const svgW = plot.width * SCALE + padding * 2;

  // Reserve space for legend if furniture exists
  const legendHeight = furniture.length > 0 ? 30 + Math.ceil(uniqueTypes(furniture).length / 4) * 16 : 0;
  const svgH = plot.height * SCALE + padding * 2 + legendHeight;

  const types = uniqueTypes(furniture);

  return (
    <svg
      width={svgW * zoom}
      height={svgH * zoom}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="mx-auto"
      id="floor-plan-svg"
    >
      {/* Pattern definitions */}
      <defs>
        {/* Grid pattern */}
        <pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
          <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />
        </pattern>

        {/* Diagonal hatching for wet rooms (bathroom, kitchen) */}
        <pattern
          id="hatch-wet"
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={6} stroke="#94A3B8" strokeWidth={0.5} />
        </pattern>
      </defs>

      {/* White background */}
      <rect x={0} y={0} width={svgW} height={svgH} fill="white" />

      {/* Grid */}
      <rect x={padding} y={padding} width={plot.width * SCALE} height={plot.height * SCALE} fill="url(#grid)" />

      {/* Dimension lines (outside plot area) */}
      <DimensionLines rooms={rooms} plot={plot} padding={padding} />

      {/* Main drawing area (offset by padding) */}
      <g transform={`translate(${padding}, ${padding})`}>
        {/* Layer 0: Landscaping (below everything) */}
        {landscaping.length > 0 && (
          <LandscapingOverlay elements={landscaping} />
        )}

        {/* Layer 1: Room backgrounds (subtle fills, hatching, labels) */}
        {rooms.map((room) => (
          <RoomRect key={room.id} room={room} />
        ))}

        {/* Layer 2: Lighting coverage circles (below furniture) */}
        {lighting.length > 0 && (
          <LightingOverlay fixtures={lighting} />
        )}

        {/* Layer 3: Furniture (rendered above room fills) */}
        {furniture.map((item) => (
          <FurnitureRect key={item.id} item={item} />
        ))}

        {/* Layer 4: HVAC elements and ducts */}
        {(hvac.length > 0 || ductRuns.length > 0) && (
          <HVACOverlay elements={hvac} ductRuns={ductRuns} />
        )}

        {/* Layer 5: Plumbing fixtures and pipe runs */}
        {(plumbing.length > 0 || plumbingRuns.length > 0) && (
          <PlumbingOverlay fixtures={plumbing} runs={plumbingRuns} />
        )}

        {/* Layer 6: Staircases and elevators */}
        {staircases.map((s) => (
          <StaircaseMarker key={s.id} staircase={s} />
        ))}
        {elevators.map((e) => (
          <ElevatorMarker key={e.id} elevator={e} />
        ))}

        {/* Layer 7: Walls (thick filled rects, gaps at doors/windows) */}
        <WallRenderer rooms={rooms} plot={plot} doors={doors} windows={windows} />

        {/* Layer 8: Doors (arc swing symbols) */}
        {doors.map((door) => (
          <DoorMarker key={door.id} door={door} rooms={rooms} />
        ))}

        {/* Layer 9: Windows (parallel-line symbols) */}
        {windows.map((win) => (
          <WindowMarker key={win.id} window={win} />
        ))}

        {/* Layer 10: Electrical fixtures (on top of walls) */}
        {electrical.length > 0 && (
          <ElectricalOverlay fixtures={electrical} />
        )}

        {/* Layer 11: Annotations (topmost) */}
        {annotations.length > 0 && (
          <AnnotationOverlay annotations={annotations} />
        )}
      </g>

      {/* Floor label if multi-story */}
      {floorPlan.floorName && (
        <text
          x={padding}
          y={padding - 8}
          fontSize={11}
          fontWeight={600}
          fill="#4B5563"
        >
          {floorPlan.floorName}
          {floorPlan.floorLevel !== undefined && ` (Level ${floorPlan.floorLevel})`}
        </text>
      )}

      {/* Legend — only if furniture exists */}
      {types.length > 0 && (
        <g transform={`translate(${padding}, ${padding + plot.height * SCALE + 14})`}>
          <text fontSize={9} fontWeight={600} fill="#374151" y={0}>
            Furniture Legend
          </text>
          {types.map((t, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const lx = col * ((svgW - padding * 2) / 4);
            const ly = 10 + row * 16;
            const color = furnitureColors[t.type] ?? "#E5E7EB";
            return (
              <g key={t.type} transform={`translate(${lx}, ${ly})`}>
                <rect x={0} y={0} width={10} height={10} rx={1.5} fill={color} stroke="#6B7280" strokeWidth={0.5} />
                <text x={14} y={8.5} fontSize={8} fill="#4B5563">
                  {t.name}
                </text>
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
