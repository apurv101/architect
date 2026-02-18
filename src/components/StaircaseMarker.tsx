import type { Staircase } from "../lib/types";
import { SCALE } from "./RoomRect";

export default function StaircaseMarker({ staircase }: { staircase: Staircase }) {
  const px = staircase.x * SCALE;
  const py = staircase.y * SCALE;
  const pw = staircase.width * SCALE;
  const ph = staircase.height * SCALE;

  const isVertical = staircase.orientation === "vertical";
  const treadCount = isVertical ? Math.floor(ph / 5) : Math.floor(pw / 5);
  const treadSpacing = isVertical ? ph / treadCount : pw / treadCount;

  // Arrow for direction
  const arrowSize = 6;
  let arrowPath: string;
  if (isVertical) {
    const cx = px + pw / 2;
    if (staircase.direction === "up") {
      arrowPath = `M ${cx - arrowSize} ${py + ph * 0.3} L ${cx} ${py + ph * 0.15} L ${cx + arrowSize} ${py + ph * 0.3}`;
    } else if (staircase.direction === "down") {
      arrowPath = `M ${cx - arrowSize} ${py + ph * 0.7} L ${cx} ${py + ph * 0.85} L ${cx + arrowSize} ${py + ph * 0.7}`;
    } else {
      arrowPath = `M ${cx - arrowSize} ${py + ph * 0.3} L ${cx} ${py + ph * 0.15} L ${cx + arrowSize} ${py + ph * 0.3} M ${cx - arrowSize} ${py + ph * 0.7} L ${cx} ${py + ph * 0.85} L ${cx + arrowSize} ${py + ph * 0.7}`;
    }
  } else {
    const cy = py + ph / 2;
    if (staircase.direction === "up") {
      arrowPath = `M ${px + pw * 0.3} ${cy - arrowSize} L ${px + pw * 0.15} ${cy} L ${px + pw * 0.3} ${cy + arrowSize}`;
    } else if (staircase.direction === "down") {
      arrowPath = `M ${px + pw * 0.7} ${cy - arrowSize} L ${px + pw * 0.85} ${cy} L ${px + pw * 0.7} ${cy + arrowSize}`;
    } else {
      arrowPath = `M ${px + pw * 0.3} ${cy - arrowSize} L ${px + pw * 0.15} ${cy} L ${px + pw * 0.3} ${cy + arrowSize} M ${px + pw * 0.7} ${cy - arrowSize} L ${px + pw * 0.85} ${cy} L ${px + pw * 0.7} ${cy + arrowSize}`;
    }
  }

  const label = staircase.direction === "up" ? "UP" : staircase.direction === "down" ? "DN" : "UP/DN";

  return (
    <g>
      <title>Staircase ({label})</title>
      <rect x={px} y={py} width={pw} height={ph} fill="#F3E8FF" stroke="#7C3AED" strokeWidth={1.5} rx={1} opacity={0.8} />

      {/* Treads */}
      {Array.from({ length: treadCount - 1 }, (_, i) => {
        if (isVertical) {
          const ty = py + treadSpacing * (i + 1);
          return <line key={i} x1={px + 1} y1={ty} x2={px + pw - 1} y2={ty} stroke="#7C3AED" strokeWidth={0.6} opacity={0.5} />;
        } else {
          const tx = px + treadSpacing * (i + 1);
          return <line key={i} x1={tx} y1={py + 1} x2={tx} y2={py + ph - 1} stroke="#7C3AED" strokeWidth={0.6} opacity={0.5} />;
        }
      })}

      {/* Direction arrow */}
      <path d={arrowPath} fill="none" stroke="#7C3AED" strokeWidth={1.5} />

      {/* Label */}
      <text
        x={px + pw / 2}
        y={py + ph / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(8, pw / 4)}
        fontWeight={700}
        fill="#7C3AED"
        opacity={0.9}
      >
        {label}
      </text>
    </g>
  );
}
