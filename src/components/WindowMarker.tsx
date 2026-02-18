import type { Window } from "../lib/types";
import { SCALE } from "./RoomRect";

/**
 * Renders a window with the standard architectural symbol:
 * two parallel lines crossing the wall with end caps.
 */
export default function WindowMarker({ window }: { window: Window }) {
  const x = window.x * SCALE;
  const y = window.y * SCALE;
  const w = window.width * SCALE;
  const GAP = 2; // half-width of the window symbol perpendicular to wall

  if (window.orientation === "horizontal") {
    return (
      <g>
        {/* Clear the wall behind */}
        <rect x={x} y={y - 3} width={w} height={6} fill="white" />
        {/* Two parallel lines (glass panes) */}
        <line x1={x} y1={y - GAP} x2={x + w} y2={y - GAP} stroke="#374151" strokeWidth={0.8} />
        <line x1={x} y1={y + GAP} x2={x + w} y2={y + GAP} stroke="#374151" strokeWidth={0.8} />
        {/* Center line */}
        <line x1={x} y1={y} x2={x + w} y2={y} stroke="#374151" strokeWidth={0.3} />
        {/* End caps */}
        <line x1={x} y1={y - GAP - 1} x2={x} y2={y + GAP + 1} stroke="#374151" strokeWidth={0.8} />
        <line x1={x + w} y1={y - GAP - 1} x2={x + w} y2={y + GAP + 1} stroke="#374151" strokeWidth={0.8} />
      </g>
    );
  }

  // Vertical window
  return (
    <g>
      {/* Clear the wall behind */}
      <rect x={x - 3} y={y} width={6} height={w} fill="white" />
      {/* Two parallel lines */}
      <line x1={x - GAP} y1={y} x2={x - GAP} y2={y + w} stroke="#374151" strokeWidth={0.8} />
      <line x1={x + GAP} y1={y} x2={x + GAP} y2={y + w} stroke="#374151" strokeWidth={0.8} />
      {/* Center line */}
      <line x1={x} y1={y} x2={x} y2={y + w} stroke="#374151" strokeWidth={0.3} />
      {/* End caps */}
      <line x1={x - GAP - 1} y1={y} x2={x + GAP + 1} y2={y} stroke="#374151" strokeWidth={0.8} />
      <line x1={x - GAP - 1} y1={y + w} x2={x + GAP + 1} y2={y + w} stroke="#374151" strokeWidth={0.8} />
    </g>
  );
}
