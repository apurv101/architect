import type { Door, Room } from "../lib/types";
import { SCALE } from "./RoomRect";

interface Props {
  door: Door;
  rooms: Room[];
}

/**
 * Determine which side the door swings into.
 * Returns the room the door opens into, or the fromRoom for exterior doors.
 */
function getSwingRoom(door: Door, rooms: Room[]): Room | undefined {
  const swing = door.swingDirection ?? "inward";
  if (door.toRoomId === null) {
    // Exterior door — always swings into the from room
    return rooms.find((r) => r.id === door.fromRoomId);
  }
  if (swing === "inward") {
    return rooms.find((r) => r.id === door.fromRoomId);
  }
  return rooms.find((r) => r.id === door.toRoomId);
}

/**
 * Renders a door with the standard architectural symbol:
 * - A line representing the door leaf
 * - A quarter-circle arc showing the swing path
 */
export default function DoorMarker({ door, rooms }: Props) {
  const x = door.x * SCALE;
  const y = door.y * SCALE;
  const doorW = door.width * SCALE;

  const swingRoom = getSwingRoom(door, rooms);
  if (!swingRoom) {
    // Fallback: simple line if we can't determine swing
    return (
      <line
        x1={door.orientation === "horizontal" ? x : x}
        y1={door.orientation === "horizontal" ? y : y}
        x2={door.orientation === "horizontal" ? x + doorW : x}
        y2={door.orientation === "horizontal" ? y : y + doorW}
        stroke="#374151"
        strokeWidth={1.5}
      />
    );
  }

  const roomCx = (swingRoom.x + swingRoom.width / 2) * SCALE;
  const roomCy = (swingRoom.y + swingRoom.height / 2) * SCALE;

  if (door.orientation === "horizontal") {
    // Door on a horizontal wall (shared top/bottom edge)
    // Determine if door swings down (into room below) or up (into room above)
    const swingsDown = roomCy > y;

    // Hinge at left end, door opens to right and swings down/up
    const hingeX = x;
    const hingeY = y;
    const openX = x + doorW;
    const openY = y;

    // Arc end point: the door leaf rotated 90° around the hinge
    const arcEndX = hingeX;
    const arcEndY = swingsDown ? hingeY + doorW : hingeY - doorW;

    // SVG arc: sweep flag determines clockwise vs counterclockwise
    const sweepFlag = swingsDown ? 0 : 1;

    return (
      <g>
        {/* Door leaf line (from hinge to open position at 90°) */}
        <line
          x1={hingeX}
          y1={hingeY}
          x2={arcEndX}
          y2={arcEndY}
          stroke="#374151"
          strokeWidth={1.2}
        />
        {/* Quarter-circle arc showing swing path */}
        <path
          d={`M ${openX} ${openY} A ${doorW} ${doorW} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`}
          fill="none"
          stroke="#374151"
          strokeWidth={0.7}
          strokeDasharray="2,1.5"
        />
      </g>
    );
  } else {
    // Door on a vertical wall (shared left/right edge)
    // Determine if door swings right (into room to the right) or left
    const swingsRight = roomCx > x;

    const hingeX = x;
    const hingeY = y;
    const openX = x;
    const openY = y + doorW;

    // Arc end point
    const arcEndX = swingsRight ? hingeX + doorW : hingeX - doorW;
    const arcEndY = hingeY;

    const sweepFlag = swingsRight ? 1 : 0;

    return (
      <g>
        {/* Door leaf line */}
        <line
          x1={hingeX}
          y1={hingeY}
          x2={arcEndX}
          y2={arcEndY}
          stroke="#374151"
          strokeWidth={1.2}
        />
        {/* Quarter-circle arc */}
        <path
          d={`M ${openX} ${openY} A ${doorW} ${doorW} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`}
          fill="none"
          stroke="#374151"
          strokeWidth={0.7}
          strokeDasharray="2,1.5"
        />
      </g>
    );
  }
}
