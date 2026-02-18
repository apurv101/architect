import type { FloorPlan } from "../lib/types";
import RoomRect, { SCALE } from "./RoomRect";
import DoorMarker from "./DoorMarker";

interface Props {
  floorPlan: FloorPlan;
  zoom: number;
}

export default function FloorPlanSVG({ floorPlan, zoom }: Props) {
  const { plot, rooms, doors } = floorPlan;
  const padding = 40;
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
      {/* Grid pattern */}
      <defs>
        <pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
          <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />
        </pattern>
      </defs>

      {/* Background */}
      <rect x={0} y={0} width={svgW} height={svgH} fill="white" />

      {/* Grid */}
      <rect x={padding} y={padding} width={plot.width * SCALE} height={plot.height * SCALE} fill="url(#grid)" />

      {/* Plot boundary */}
      <rect
        x={padding}
        y={padding}
        width={plot.width * SCALE}
        height={plot.height * SCALE}
        fill="none"
        stroke="#111827"
        strokeWidth={2.5}
      />

      {/* Dimension labels */}
      <text
        x={padding + (plot.width * SCALE) / 2}
        y={padding - 10}
        textAnchor="middle"
        fontSize={12}
        fill="#6B7280"
      >
        {plot.width} ft
      </text>
      <text
        x={padding - 10}
        y={padding + (plot.height * SCALE) / 2}
        textAnchor="middle"
        fontSize={12}
        fill="#6B7280"
        transform={`rotate(-90, ${padding - 10}, ${padding + (plot.height * SCALE) / 2})`}
      >
        {plot.height} ft
      </text>

      {/* Rooms (offset by padding) */}
      <g transform={`translate(${padding}, ${padding})`}>
        {rooms.map((room) => (
          <RoomRect key={room.id} room={room} />
        ))}
        {doors.map((door) => (
          <DoorMarker key={door.id} door={door} />
        ))}
      </g>
    </svg>
  );
}
