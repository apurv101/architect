import type { ElevationView } from "../lib/types";

const SCALE = 10;

const DEFAULT_FILLS: Record<string, string> = {
  wall: "#F5F5F4",
  window: "#BFDBFE",
  door: "#D6D3D1",
  roof: "#A8A29E",
  foundation: "#9CA3AF",
  chimney: "#D6D3D1",
  column: "#E7E5E4",
};

const DEFAULT_STROKES: Record<string, string> = {
  wall: "#78716C",
  window: "#6B7280",
  door: "#78716C",
  roof: "#57534E",
  foundation: "#6B7280",
  chimney: "#78716C",
  column: "#78716C",
};

interface Props {
  elevation: ElevationView;
  zoom: number;
}

export default function ElevationViewSVG({ elevation, zoom }: Props) {
  const padding = 40;
  const svgW = elevation.width * SCALE + padding * 2;
  const svgH = elevation.height * SCALE + padding * 2;

  return (
    <svg
      width={svgW * zoom}
      height={svgH * zoom}
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="mx-auto"
      id="elevation-view-svg"
    >
      <rect x={0} y={0} width={svgW} height={svgH} fill="white" />

      {/* Title */}
      <text
        x={svgW / 2}
        y={16}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="#374151"
      >
        {elevation.direction.charAt(0).toUpperCase() + elevation.direction.slice(1)} Elevation
      </text>

      <g transform={`translate(${padding}, ${padding})`}>
        {/* Ground line */}
        <line
          x1={-10}
          y1={elevation.height * SCALE}
          x2={elevation.width * SCALE + 10}
          y2={elevation.height * SCALE}
          stroke="#57534E"
          strokeWidth={2}
        />

        {/* Elements */}
        {elevation.elements.map((elem, i) => {
          const x = elem.x * SCALE;
          const y = elem.y * SCALE;
          const w = elem.width * SCALE;
          const h = elem.height * SCALE;
          const fill = elem.fill ?? DEFAULT_FILLS[elem.type] ?? "#E5E7EB";
          const stroke = elem.stroke ?? DEFAULT_STROKES[elem.type] ?? "#6B7280";

          if (elem.type === "roof") {
            // Triangle for roof
            const midX = x + w / 2;
            return (
              <polygon
                key={i}
                points={`${x},${y + h} ${midX},${y} ${x + w},${y + h}`}
                fill={fill}
                stroke={stroke}
                strokeWidth={1.5}
              />
            );
          }

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={h}
              fill={fill}
              stroke={stroke}
              strokeWidth={elem.type === "wall" || elem.type === "foundation" ? 1.5 : 1}
              rx={elem.type === "window" ? 1 : 0}
            />
          );
        })}

        {/* Height dimension */}
        <line x1={-15} y1={0} x2={-15} y2={elevation.height * SCALE} stroke="#9CA3AF" strokeWidth={0.5} />
        <line x1={-18} y1={0} x2={-12} y2={0} stroke="#9CA3AF" strokeWidth={0.5} />
        <line x1={-18} y1={elevation.height * SCALE} x2={-12} y2={elevation.height * SCALE} stroke="#9CA3AF" strokeWidth={0.5} />
        <text
          x={-20}
          y={elevation.height * SCALE / 2}
          textAnchor="middle"
          fontSize={7}
          fill="#9CA3AF"
          transform={`rotate(-90, -20, ${elevation.height * SCALE / 2})`}
        >
          {elevation.height}&apos;
        </text>

        {/* Width dimension */}
        <line x1={0} y1={elevation.height * SCALE + 15} x2={elevation.width * SCALE} y2={elevation.height * SCALE + 15} stroke="#9CA3AF" strokeWidth={0.5} />
        <line x1={0} y1={elevation.height * SCALE + 12} x2={0} y2={elevation.height * SCALE + 18} stroke="#9CA3AF" strokeWidth={0.5} />
        <line x1={elevation.width * SCALE} y1={elevation.height * SCALE + 12} x2={elevation.width * SCALE} y2={elevation.height * SCALE + 18} stroke="#9CA3AF" strokeWidth={0.5} />
        <text
          x={elevation.width * SCALE / 2}
          y={elevation.height * SCALE + 25}
          textAnchor="middle"
          fontSize={7}
          fill="#9CA3AF"
        >
          {elevation.width}&apos;
        </text>
      </g>
    </svg>
  );
}
