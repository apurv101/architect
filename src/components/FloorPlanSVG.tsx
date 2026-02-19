import type { FloorPlan } from "../lib/types";
import RoomRect, { SCALE } from "./RoomRect";
import DoorMarker from "./DoorMarker";
import WallRenderer from "./WallRenderer";
import WindowMarker from "./WindowMarker";
import DimensionLines from "./DimensionLines";

interface Props {
  floorPlan: FloorPlan;
  zoom: number;
}

export default function FloorPlanSVG({ floorPlan, zoom }: Props) {
  const { plot, rooms, doors } = floorPlan;
  const windows = floorPlan.windows ?? [];
  const padding = 60;

  const svgW = plot.width * SCALE + padding * 2;
  const svgH = plot.height * SCALE + padding * 2;

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
        {/* Layer 1: Room backgrounds (subtle fills, hatching, labels) */}
        {rooms.map((room) => (
          <RoomRect key={room.id} room={room} />
        ))}

        {/* Layer 2: Walls (thick filled rects, gaps at doors/windows) */}
        <WallRenderer rooms={rooms} plot={plot} doors={doors} windows={windows} />

        {/* Layer 3: Doors (arc swing symbols) */}
        {doors.map((door) => (
          <DoorMarker key={door.id} door={door} rooms={rooms} />
        ))}

        {/* Layer 4: Windows (parallel-line symbols) */}
        {windows.map((win) => (
          <WindowMarker key={win.id} window={win} />
        ))}
      </g>
    </svg>
  );
}
