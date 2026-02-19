import type { BlockingLayout } from "../lib/types";
import RoomRect, { SCALE } from "./RoomRect";

interface Props {
  blockingLayout: BlockingLayout;
}

export default function BlockingLayoutView({ blockingLayout }: Props) {
  const { plot, rooms, adjacencies } = blockingLayout;
  const padding = 60;

  const svgW = plot.width * SCALE + padding * 2;
  const svgH = plot.height * SCALE + padding * 2;

  // Build room center lookup for adjacency lines
  const roomCenters = new Map(
    rooms.map((r) => [
      r.id,
      {
        cx: (r.x + r.width / 2) * SCALE + padding,
        cy: (r.y + r.height / 2) * SCALE + padding,
      },
    ])
  );

  // Check which adjacencies are satisfied (rooms share a wall)
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  function sharesWall(idA: string, idB: string): boolean {
    const a = roomMap.get(idA);
    const b = roomMap.get(idB);
    if (!a || !b) return false;
    const hOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const vOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const touchH = (a.y + a.height === b.y || b.y + b.height === a.y) && hOverlap > 0;
    const touchV = (a.x + a.width === b.x || b.x + b.width === a.x) && vOverlap > 0;
    return touchH || touchV;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
        Step 3 of 5 — Room Placement
      </div>

      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="mx-auto"
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="blocking-grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
            <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />
          </pattern>
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill="white" />

        {/* Grid */}
        <rect
          x={padding}
          y={padding}
          width={plot.width * SCALE}
          height={plot.height * SCALE}
          fill="url(#blocking-grid)"
        />

        {/* Plot outline */}
        <rect
          x={padding}
          y={padding}
          width={plot.width * SCALE}
          height={plot.height * SCALE}
          fill="none"
          stroke="#9CA3AF"
          strokeWidth={2}
          strokeDasharray="6 3"
        />

        {/* Adjacency lines (behind rooms) */}
        {adjacencies.map((adj, i) => {
          const from = roomCenters.get(adj.roomId);
          const to = roomCenters.get(adj.adjacentTo);
          if (!from || !to) return null;
          const satisfied = sharesWall(adj.roomId, adj.adjacentTo);
          return (
            <line
              key={`adj-${i}`}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke={satisfied ? "#22C55E" : "#EF4444"}
              strokeWidth={1.5}
              strokeDasharray={satisfied ? "none" : "4 3"}
              opacity={0.5}
            />
          );
        })}

        {/* Room rectangles */}
        <g transform={`translate(${padding}, ${padding})`}>
          {rooms.map((room) => (
            <RoomRect key={room.id} room={room} />
          ))}
        </g>

        {/* Room outlines (simple borders, no wall merging) */}
        <g transform={`translate(${padding}, ${padding})`}>
          {rooms.map((room) => (
            <rect
              key={`outline-${room.id}`}
              x={room.x * SCALE}
              y={room.y * SCALE}
              width={room.width * SCALE}
              height={room.height * SCALE}
              fill="none"
              stroke="#6B7280"
              strokeWidth={2}
            />
          ))}
        </g>

        {/* Plot dimensions */}
        <text
          x={padding + (plot.width * SCALE) / 2}
          y={padding - 10}
          textAnchor="middle"
          fontSize={11}
          fill="#6B7280"
          fontFamily="monospace"
        >
          {plot.width} ft
        </text>
        <text
          x={padding - 10}
          y={padding + (plot.height * SCALE) / 2}
          textAnchor="middle"
          fontSize={11}
          fill="#6B7280"
          fontFamily="monospace"
          transform={`rotate(-90, ${padding - 10}, ${padding + (plot.height * SCALE) / 2})`}
        >
          {plot.height} ft
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 bg-green-500" /> Adjacency satisfied
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-red-500" /> Adjacency unsatisfied
        </span>
      </div>

      {/* Notes */}
      {blockingLayout.notes && (
        <p className="text-xs text-gray-400 text-center italic max-w-md">{blockingLayout.notes}</p>
      )}
    </div>
  );
}
