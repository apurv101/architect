import type { Door } from "../lib/types";
import { SCALE } from "./RoomRect";

export default function DoorMarker({ door }: { door: Door }) {
  const x = door.x * SCALE;
  const y = door.y * SCALE;
  const w = door.width * SCALE;

  if (door.orientation === "horizontal") {
    return (
      <g>
        <rect x={x} y={y - 2} width={w} height={4} fill="#FBBF24" />
        <line x1={x} y1={y} x2={x + w} y2={y} stroke="#D97706" strokeWidth={2} />
      </g>
    );
  }

  return (
    <g>
      <rect x={x - 2} y={y} width={4} height={w} fill="#FBBF24" />
      <line x1={x} y1={y} x2={x} y2={y + w} stroke="#D97706" strokeWidth={2} />
    </g>
  );
}
