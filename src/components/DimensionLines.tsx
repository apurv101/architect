import type { Room, Plot } from "../lib/types";
import { SCALE } from "./RoomRect";

interface Props {
  rooms: Room[];
  plot: Plot;
  padding: number;
}

interface DimSegment {
  start: number; // pixels
  end: number; // pixels
  label: string;
}

/** Compute dimension chain breakpoints along a plot edge */
function computeChain(
  rooms: Room[],
  getStart: (r: Room) => number,
  getEnd: (r: Room) => number,
  plotSize: number
): DimSegment[] {
  const breaks = new Set<number>([0, plotSize]);
  for (const r of rooms) {
    breaks.add(getStart(r));
    breaks.add(getEnd(r));
  }
  const sorted = [...breaks].sort((a, b) => a - b);
  return sorted.slice(0, -1).map((s, i) => ({
    start: s * SCALE,
    end: sorted[i + 1] * SCALE,
    label: `${sorted[i + 1] - s}'`,
  }));
}

function HorizontalDimLine({
  x1,
  x2,
  y,
  label,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
}) {
  const tick = 3;
  return (
    <g>
      {/* Extension lines */}
      <line x1={x1} y1={y + 8} x2={x1} y2={y - 2} stroke="#9CA3AF" strokeWidth={0.4} />
      <line x1={x2} y1={y + 8} x2={x2} y2={y - 2} stroke="#9CA3AF" strokeWidth={0.4} />
      {/* Dimension line */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#6B7280" strokeWidth={0.5} />
      {/* Tick marks (45° slashes) */}
      <line
        x1={x1 - tick}
        y1={y + tick}
        x2={x1 + tick}
        y2={y - tick}
        stroke="#6B7280"
        strokeWidth={0.7}
      />
      <line
        x1={x2 - tick}
        y1={y + tick}
        x2={x2 + tick}
        y2={y - tick}
        stroke="#6B7280"
        strokeWidth={0.7}
      />
      {/* Label */}
      <text
        x={(x1 + x2) / 2}
        y={y - 4}
        textAnchor="middle"
        fontSize={7}
        fill="#6B7280"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
        {label}
      </text>
    </g>
  );
}

function VerticalDimLine({
  y1,
  y2,
  x,
  label,
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
}) {
  const tick = 3;
  return (
    <g>
      {/* Extension lines */}
      <line x1={x - 8} y1={y1} x2={x + 2} y2={y1} stroke="#9CA3AF" strokeWidth={0.4} />
      <line x1={x - 8} y1={y2} x2={x + 2} y2={y2} stroke="#9CA3AF" strokeWidth={0.4} />
      {/* Dimension line */}
      <line x1={x} y1={y1} x2={x} y2={y2} stroke="#6B7280" strokeWidth={0.5} />
      {/* Tick marks */}
      <line
        x1={x - tick}
        y1={y1 + tick}
        x2={x + tick}
        y2={y1 - tick}
        stroke="#6B7280"
        strokeWidth={0.7}
      />
      <line
        x1={x - tick}
        y1={y2 + tick}
        x2={x + tick}
        y2={y2 - tick}
        stroke="#6B7280"
        strokeWidth={0.7}
      />
      {/* Label */}
      <text
        x={x - 5}
        y={(y1 + y2) / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={7}
        fill="#6B7280"
        style={{ fontFamily: "'Courier New', monospace" }}
        transform={`rotate(-90, ${x - 5}, ${(y1 + y2) / 2})`}
      >
        {label}
      </text>
    </g>
  );
}

export default function DimensionLines({ rooms, plot, padding }: Props) {
  // Top edge dimension chain (rooms touching y=0)
  const topRooms = rooms.filter((r) => r.y === 0);
  const topChain = computeChain(topRooms, (r) => r.x, (r) => r.x + r.width, plot.width);

  // Left edge dimension chain (rooms touching x=0)
  const leftRooms = rooms.filter((r) => r.x === 0);
  const leftChain = computeChain(leftRooms, (r) => r.y, (r) => r.y + r.height, plot.height);

  const dimOffsetInner = 15; // room breakdown
  const dimOffsetOuter = 28; // overall dimension

  return (
    <g>
      {/* Top dimension chain — room breakdowns */}
      {topChain.length > 1 &&
        topChain.map((seg, i) => (
          <HorizontalDimLine
            key={`top-${i}`}
            x1={padding + seg.start}
            x2={padding + seg.end}
            y={padding - dimOffsetInner}
            label={seg.label}
          />
        ))}

      {/* Top overall dimension */}
      <HorizontalDimLine
        x1={padding}
        x2={padding + plot.width * SCALE}
        y={padding - dimOffsetOuter}
        label={`${plot.width}'`}
      />

      {/* Left dimension chain — room breakdowns */}
      {leftChain.length > 1 &&
        leftChain.map((seg, i) => (
          <VerticalDimLine
            key={`left-${i}`}
            y1={padding + seg.start}
            y2={padding + seg.end}
            x={padding - dimOffsetInner}
            label={seg.label}
          />
        ))}

      {/* Left overall dimension */}
      <VerticalDimLine
        y1={padding}
        y2={padding + plot.height * SCALE}
        x={padding - dimOffsetOuter}
        label={`${plot.height}'`}
      />
    </g>
  );
}
