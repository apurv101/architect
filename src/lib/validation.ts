import type { FloorPlan, Room } from "./types";
import { validateRoomPlacement } from "../skills/floor-plan/validators";

export interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

export function validateFloorPlan(fp: FloorPlan): ValidationError[] {
  // Checks 1-4: bounds, min dimensions, aspect ratios, overlaps
  const errors = validateRoomPlacement(fp.plot, fp.rooms);

  // 5. Door validation
  for (const door of fp.doors) {
    if (door.toRoomId === null) {
      // Exterior door -- check it's on a plot boundary
      const onBoundary =
        door.y === 0 ||
        door.x === 0 ||
        door.y === fp.plot.height ||
        door.x === fp.plot.width;
      if (!onBoundary) {
        errors.push({
          severity: "warning",
          message: `Exterior door "${door.id}" is not on a plot boundary edge (x:${door.x}, y:${door.y}).`,
        });
      }
      continue;
    }

    const fromRoom = fp.rooms.find((r) => r.id === door.fromRoomId);
    const toRoom = fp.rooms.find((r) => r.id === door.toRoomId);

    if (!fromRoom) {
      errors.push({
        severity: "error",
        message: `Door "${door.id}" references unknown fromRoomId "${door.fromRoomId}".`,
      });
      continue;
    }
    if (!toRoom) {
      errors.push({
        severity: "error",
        message: `Door "${door.id}" references unknown toRoomId "${door.toRoomId}".`,
      });
      continue;
    }

    if (!roomsShareWall(fromRoom, toRoom)) {
      errors.push({
        severity: "warning",
        message: `Door "${door.id}" connects "${fromRoom.name}" and "${toRoom.name}" but they don't share a wall.`,
      });
    }
  }

  // 6. Window validation
  for (const win of fp.windows ?? []) {
    const room = fp.rooms.find((r) => r.id === win.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Window "${win.id}" references unknown roomId "${win.roomId}".`,
      });
      continue;
    }

    // Check window is on an exterior wall of the room
    if (win.orientation === "horizontal") {
      const onRoomTop = win.y === room.y;
      const onRoomBottom = win.y === room.y + room.height;
      const onPlotBoundary = win.y === 0 || win.y === fp.plot.height;
      if (!(onRoomTop || onRoomBottom)) {
        errors.push({
          severity: "warning",
          message: `Window "${win.id}" y=${win.y} is not on a horizontal edge of room "${room.name}".`,
        });
      } else if (!onPlotBoundary) {
        errors.push({
          severity: "warning",
          message: `Window "${win.id}" is on an interior wall, not an exterior wall (y=${win.y}).`,
        });
      }
      // Check window range within room width
      if (win.x < room.x || win.x + win.width > room.x + room.width) {
        errors.push({
          severity: "warning",
          message: `Window "${win.id}" extends outside room "${room.name}" along the wall.`,
        });
      }
    } else {
      const onRoomLeft = win.x === room.x;
      const onRoomRight = win.x === room.x + room.width;
      const onPlotBoundary = win.x === 0 || win.x === fp.plot.width;
      if (!(onRoomLeft || onRoomRight)) {
        errors.push({
          severity: "warning",
          message: `Window "${win.id}" x=${win.x} is not on a vertical edge of room "${room.name}".`,
        });
      } else if (!onPlotBoundary) {
        errors.push({
          severity: "warning",
          message: `Window "${win.id}" is on an interior wall, not an exterior wall (x=${win.x}).`,
        });
      }
      // Check window range within room height
      if (win.y < room.y || win.y + win.width > room.y + room.height) {
        errors.push({
          severity: "warning",
          message: `Window "${win.id}" extends outside room "${room.name}" along the wall.`,
        });
      }
    }
  }

  return errors;
}

export function roomsOverlap(a: Room, b: Room): boolean {
  const xOverlap = a.x < b.x + b.width && a.x + a.width > b.x;
  const yOverlap = a.y < b.y + b.height && a.y + a.height > b.y;
  return xOverlap && yOverlap;
}

export function computeOverlapArea(a: Room, b: Room): number {
  const xOverlap = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  );
  return xOverlap * yOverlap;
}

export function roomsShareWall(a: Room, b: Room): boolean {
  const TOLERANCE = 0.5;

  const verticallyAligned =
    Math.max(a.y, b.y) < Math.min(a.y + a.height, b.y + b.height);
  const horizontallyAligned =
    Math.max(a.x, b.x) < Math.min(a.x + a.width, b.x + b.width);

  const aRightMeetsBLeft =
    Math.abs(a.x + a.width - b.x) <= TOLERANCE && verticallyAligned;
  const bRightMeetsALeft =
    Math.abs(b.x + b.width - a.x) <= TOLERANCE && verticallyAligned;
  const aBottomMeetsBTop =
    Math.abs(a.y + a.height - b.y) <= TOLERANCE && horizontallyAligned;
  const bBottomMeetsATop =
    Math.abs(b.y + b.height - a.y) <= TOLERANCE && horizontallyAligned;

  return aRightMeetsBLeft || bRightMeetsALeft || aBottomMeetsBTop || bBottomMeetsATop;
}
