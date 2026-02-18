import type { Elevator } from "../lib/types";
import { SCALE } from "./RoomRect";

export default function ElevatorMarker({ elevator }: { elevator: Elevator }) {
  const px = elevator.x * SCALE;
  const py = elevator.y * SCALE;
  const pw = elevator.width * SCALE;
  const ph = elevator.height * SCALE;

  return (
    <g>
      <title>Elevator</title>
      <rect x={px} y={py} width={pw} height={ph} fill="#E0E7FF" stroke="#4F46E5" strokeWidth={1.5} rx={1} opacity={0.8} />

      {/* X pattern */}
      <line x1={px + 2} y1={py + 2} x2={px + pw - 2} y2={py + ph - 2} stroke="#4F46E5" strokeWidth={1} opacity={0.6} />
      <line x1={px + pw - 2} y1={py + 2} x2={px + 2} y2={py + ph - 2} stroke="#4F46E5" strokeWidth={1} opacity={0.6} />

      {/* Label */}
      <text
        x={px + pw / 2}
        y={py + ph / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.min(8, pw / 4)}
        fontWeight={700}
        fill="#4F46E5"
        opacity={0.9}
      >
        ELEV
      </text>
    </g>
  );
}
