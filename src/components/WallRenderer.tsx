import type { Room, Plot, Door, Window } from "../lib/types";
import { SCALE } from "./RoomRect";

const WALL_EXTERIOR = 5; // px thickness for exterior walls
const WALL_INTERIOR = 3; // px thickness for interior walls
const WALL_COLOR = "#1F2937";

interface WallSegment {
  /** Position along the wall in pixels */
  start: number;
  end: number;
  /** Fixed coordinate (perpendicular to wall direction) in pixels */
  pos: number;
  /** Is this wall on the plot boundary? */
  isExterior: boolean;
  orientation: "horizontal" | "vertical";
}

interface Opening {
  /** Position along the wall in pixels */
  start: number;
  end: number;
  /** Fixed coordinate in feet */
  pos: number;
  orientation: "horizontal" | "vertical";
}

/**
 * Collect all edges from all rooms, deduplicate shared edges,
 * classify as exterior/interior, then split at door/window openings.
 */
function computeWallSegments(
  rooms: Room[],
  plot: Plot,
  doors: Door[],
  windows: Window[]
): WallSegment[] {
  // Collect all edges as { orientation, pos (feet), start (feet), end (feet) }
  interface RawEdge {
    orientation: "horizontal" | "vertical";
    pos: number; // fixed coordinate in feet
    start: number; // range start in feet
    end: number; // range end in feet
  }

  const hEdges: RawEdge[] = [];
  const vEdges: RawEdge[] = [];

  for (const room of rooms) {
    // Top edge
    hEdges.push({ orientation: "horizontal", pos: room.y, start: room.x, end: room.x + room.width });
    // Bottom edge
    hEdges.push({ orientation: "horizontal", pos: room.y + room.height, start: room.x, end: room.x + room.width });
    // Left edge
    vEdges.push({ orientation: "vertical", pos: room.x, start: room.y, end: room.y + room.height });
    // Right edge
    vEdges.push({ orientation: "vertical", pos: room.x + room.width, start: room.y, end: room.y + room.height });
  }

  // Merge overlapping edges at the same position into unique wall lines
  function mergeEdges(edges: RawEdge[]): RawEdge[] {
    // Group by position
    const byPos = new Map<number, RawEdge[]>();
    for (const e of edges) {
      const key = Math.round(e.pos * 100) / 100;
      const list = byPos.get(key) ?? [];
      list.push(e);
      byPos.set(key, list);
    }

    const merged: RawEdge[] = [];
    for (const [, group] of byPos) {
      // Sort by start, then merge overlapping/touching ranges
      const sorted = [...group].sort((a, b) => a.start - b.start);
      let current = { ...sorted[0] };
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start <= current.end) {
          current.end = Math.max(current.end, sorted[i].end);
        } else {
          merged.push(current);
          current = { ...sorted[i] };
        }
      }
      merged.push(current);
    }
    return merged;
  }

  const mergedH = mergeEdges(hEdges);
  const mergedV = mergeEdges(vEdges);

  // Classify as exterior or interior
  function isExteriorH(edge: RawEdge): boolean {
    return edge.pos === 0 || edge.pos === plot.height;
  }
  function isExteriorV(edge: RawEdge): boolean {
    return edge.pos === 0 || edge.pos === plot.width;
  }

  // Build openings list from doors and windows
  const openings: Opening[] = [];
  for (const door of doors) {
    if (door.orientation === "horizontal") {
      openings.push({
        start: door.x * SCALE,
        end: (door.x + door.width) * SCALE,
        pos: door.y,
        orientation: "horizontal",
      });
    } else {
      openings.push({
        start: door.y * SCALE,
        end: (door.y + door.width) * SCALE,
        pos: door.x,
        orientation: "vertical",
      });
    }
  }
  for (const win of windows) {
    if (win.orientation === "horizontal") {
      openings.push({
        start: win.x * SCALE,
        end: (win.x + win.width) * SCALE,
        pos: win.y,
        orientation: "horizontal",
      });
    } else {
      openings.push({
        start: win.y * SCALE,
        end: (win.y + win.width) * SCALE,
        pos: win.x,
        orientation: "vertical",
      });
    }
  }

  // Split wall segments at openings
  function splitAtOpenings(
    edge: RawEdge,
    isExterior: boolean
  ): WallSegment[] {
    const startPx = edge.start * SCALE;
    const endPx = edge.end * SCALE;
    const posFeet = edge.pos;

    // Find openings on this edge
    const relevantOpenings = openings.filter(
      (o) =>
        o.orientation === edge.orientation &&
        Math.abs(o.pos - posFeet) < 0.5 &&
        o.end > startPx &&
        o.start < endPx
    );

    if (relevantOpenings.length === 0) {
      return [
        {
          start: startPx,
          end: endPx,
          pos: posFeet * SCALE,
          isExterior,
          orientation: edge.orientation,
        },
      ];
    }

    // Sort openings by position
    const sorted = [...relevantOpenings].sort((a, b) => a.start - b.start);
    const segments: WallSegment[] = [];
    let cursor = startPx;

    for (const opening of sorted) {
      const gapStart = Math.max(opening.start, startPx);
      const gapEnd = Math.min(opening.end, endPx);
      if (cursor < gapStart) {
        segments.push({
          start: cursor,
          end: gapStart,
          pos: posFeet * SCALE,
          isExterior,
          orientation: edge.orientation,
        });
      }
      cursor = gapEnd;
    }

    if (cursor < endPx) {
      segments.push({
        start: cursor,
        end: endPx,
        pos: posFeet * SCALE,
        isExterior,
        orientation: edge.orientation,
      });
    }

    return segments;
  }

  const allSegments: WallSegment[] = [];

  for (const edge of mergedH) {
    allSegments.push(...splitAtOpenings(edge, isExteriorH(edge)));
  }
  for (const edge of mergedV) {
    allSegments.push(...splitAtOpenings(edge, isExteriorV(edge)));
  }

  return allSegments;
}

interface Props {
  rooms: Room[];
  plot: Plot;
  doors: Door[];
  windows: Window[];
}

export default function WallRenderer({ rooms, plot, doors, windows }: Props) {
  const segments = computeWallSegments(rooms, plot, doors, windows);

  return (
    <g>
      {segments.map((seg, i) => {
        const thickness = seg.isExterior ? WALL_EXTERIOR : WALL_INTERIOR;

        if (seg.orientation === "horizontal") {
          return (
            <rect
              key={`wall-${i}`}
              x={seg.start}
              y={seg.pos - thickness / 2}
              width={seg.end - seg.start}
              height={thickness}
              fill={WALL_COLOR}
            />
          );
        } else {
          return (
            <rect
              key={`wall-${i}`}
              x={seg.pos - thickness / 2}
              y={seg.start}
              width={thickness}
              height={seg.end - seg.start}
              fill={WALL_COLOR}
            />
          );
        }
      })}
    </g>
  );
}
