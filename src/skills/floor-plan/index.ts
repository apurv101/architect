import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan, Room } from "../../lib/types";
import { FLOOR_PLAN_SCHEMA } from "./schema";
import { FLOOR_PLAN_SYSTEM_PROMPT } from "./prompt";

// ---- Validation ----

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function validateFloorPlan(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Rooms within plot boundaries
  for (const room of fp.rooms) {
    if (room.x < 0 || room.y < 0) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" has negative coordinates (x:${room.x}, y:${room.y}).`,
      });
    }
    if (room.x + room.width > fp.plot.width) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" exceeds plot width: x(${room.x}) + width(${room.width}) = ${room.x + room.width} > plot width(${fp.plot.width}).`,
      });
    }
    if (room.y + room.height > fp.plot.height) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" exceeds plot height: y(${room.y}) + height(${room.height}) = ${room.y + room.height} > plot height(${fp.plot.height}).`,
      });
    }
  }

  // 2. Minimum dimension checks
  for (const room of fp.rooms) {
    const minDim = room.type === "hallway" ? 3 : 5;
    if (room.width < minDim || room.height < minDim) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" (${room.type}) has a dimension below ${minDim}ft minimum: ${room.width}x${room.height}.`,
      });
    }
  }

  // 3. Aspect ratio checks
  for (const room of fp.rooms) {
    const longer = Math.max(room.width, room.height);
    const shorter = Math.min(room.width, room.height);
    if (shorter === 0) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" has a zero dimension: ${room.width}x${room.height}.`,
      });
      continue;
    }
    const ratio = longer / shorter;
    const maxRatio = room.type === "hallway" ? 8 : 4;
    if (ratio > maxRatio) {
      errors.push({
        severity: "error",
        message: `Room "${room.name}" aspect ratio ${ratio.toFixed(1)}:1 exceeds ${maxRatio}:1 limit (${room.width}x${room.height}).`,
      });
    }
  }

  // 4. Room overlap detection
  for (let i = 0; i < fp.rooms.length; i++) {
    for (let j = i + 1; j < fp.rooms.length; j++) {
      const a = fp.rooms[i];
      const b = fp.rooms[j];
      if (roomsOverlap(a, b)) {
        const overlapArea = computeOverlapArea(a, b);
        errors.push({
          severity: "error",
          message: `Rooms "${a.name}" and "${b.name}" overlap by ~${overlapArea} sqft. A: (${a.x},${a.y}) ${a.width}x${a.height}, B: (${b.x},${b.y}) ${b.width}x${b.height}.`,
        });
      }
    }
  }

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

  return errors;
}

function roomsOverlap(a: Room, b: Room): boolean {
  const xOverlap = a.x < b.x + b.width && a.x + a.width > b.x;
  const yOverlap = a.y < b.y + b.height && a.y + a.height > b.y;
  return xOverlap && yOverlap;
}

function computeOverlapArea(a: Room, b: Room): number {
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

function roomsShareWall(a: Room, b: Room): boolean {
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

// ---- Skill Definition ----

export const floorPlanSkill: Skill = {
  name: "floor-plan",
  description: "Generates and modifies architectural floor plan layouts",

  tools: [
    {
      name: "generate_floor_plan",
      description:
        "Generate or modify a floor plan layout as structured JSON. " +
        "Call this whenever the user asks for a new floor plan or changes to an existing one. " +
        "The plan will be validated; if errors are returned, fix the issues and call again.",
      input_schema: FLOOR_PLAN_SCHEMA,
    },
  ],

  handlers: {
    generate_floor_plan: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      const validationErrors = validateFloorPlan(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      // Hard errors block artifact creation and force Claude to retry
      if (hardErrors.length > 0) {
        const errorReport = hardErrors
          .map((e, i) => `${i + 1}. ${e.message}`)
          .join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" +
              warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";

        return {
          content: `Validation failed with ${hardErrors.length} error(s). Fix these and call the tool again:\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      // Warnings only -- pass through but inform Claude
      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      return {
        content: `Floor plan generated successfully with ${floorPlan.rooms.length} rooms and ${floorPlan.doors.length} doors.${warningNote}`,
        artifact: {
          kind: "floor_plan",
          data: floorPlan,
        },
      };
    },
  },

  systemPrompt: FLOOR_PLAN_SYSTEM_PROMPT,
};
