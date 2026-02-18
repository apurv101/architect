import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan, FurnitureItem, FurnitureType, RoomType, Door } from "../../lib/types";
import { FURNISH_FLOOR_PLAN_SCHEMA } from "./schema";
import { FURNITURE_LAYOUT_SYSTEM_PROMPT } from "./prompt";

// ---- Allowed furniture per room type ----

const ALLOWED_FURNITURE: Record<RoomType, FurnitureType[]> = {
  bedroom: ["bed", "nightstand", "dresser", "desk", "chair", "wardrobe", "bookshelf"],
  bathroom: ["toilet", "sink", "bathtub", "shower"],
  kitchen: ["kitchen_counter", "refrigerator", "stove", "sink"],
  living_room: ["sofa", "coffee_table", "tv_stand", "bookshelf", "chair"],
  dining_room: ["dining_table", "dining_chair", "bookshelf"],
  hallway: ["bookshelf"],
  garage: ["washing_machine"],
  balcony: ["chair", "coffee_table"],
  utility: ["washing_machine", "bookshelf"],
  entrance: ["bookshelf"],
  other: [],
};

// ---- Validation ----

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function getEffectiveBounds(item: FurnitureItem): { w: number; h: number } {
  if (item.rotation === 90 || item.rotation === 270) {
    return { w: item.height, h: item.width };
  }
  return { w: item.width, h: item.height };
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function getDoorClearanceRect(door: Door): { x: number; y: number; w: number; h: number } {
  const CLEARANCE = 3;
  if (door.orientation === "horizontal") {
    return { x: door.x, y: door.y - CLEARANCE, w: door.width, h: CLEARANCE * 2 };
  }
  return { x: door.x - CLEARANCE, y: door.y, w: CLEARANCE * 2, h: door.width };
}

function validateFurniture(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const furniture = fp.furniture ?? [];

  for (const item of furniture) {
    // 1. Room reference exists
    const room = fp.rooms.find((r) => r.id === item.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Furniture "${item.name}" (${item.id}) references unknown roomId "${item.roomId}".`,
      });
      continue;
    }

    // 2. Room-appropriate type
    const allowed = ALLOWED_FURNITURE[room.type];
    if (allowed && allowed.length > 0 && !allowed.includes(item.type)) {
      errors.push({
        severity: "error",
        message: `Furniture "${item.name}" (type: ${item.type}) is not appropriate for ${room.type} "${room.name}". Allowed: ${allowed.join(", ")}.`,
      });
    }

    // 3. Within room bounds
    const { w, h } = getEffectiveBounds(item);
    if (
      item.x < room.x ||
      item.y < room.y ||
      item.x + w > room.x + room.width ||
      item.y + h > room.y + room.height
    ) {
      errors.push({
        severity: "error",
        message: `Furniture "${item.name}" at (${item.x},${item.y}) size ${w}x${h} extends outside room "${room.name}" bounds (${room.x},${room.y}) ${room.width}x${room.height}.`,
      });
    }
  }

  // 4. Overlap detection within each room
  const byRoom = new Map<string, FurnitureItem[]>();
  for (const item of furniture) {
    const list = byRoom.get(item.roomId) ?? [];
    list.push(item);
    byRoom.set(item.roomId, list);
  }

  for (const [, items] of byRoom) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const aB = getEffectiveBounds(items[i]);
        const bB = getEffectiveBounds(items[j]);
        if (rectsOverlap(items[i].x, items[i].y, aB.w, aB.h, items[j].x, items[j].y, bB.w, bB.h)) {
          errors.push({
            severity: "error",
            message: `Furniture "${items[i].name}" and "${items[j].name}" overlap in room "${items[i].roomId}".`,
          });
        }
      }
    }
  }

  // 5. Door clearance (3ft) -- warnings only
  for (const door of fp.doors) {
    const clearance = getDoorClearanceRect(door);
    for (const item of furniture) {
      const { w, h } = getEffectiveBounds(item);
      if (rectsOverlap(item.x, item.y, w, h, clearance.x, clearance.y, clearance.w, clearance.h)) {
        errors.push({
          severity: "warning",
          message: `Furniture "${item.name}" is within the 3ft clearance zone of door "${door.id}".`,
        });
      }
    }
  }

  // 6. Bed clearance (2ft on non-head sides) -- warnings only
  for (const item of furniture) {
    if (item.type === "bed") {
      const room = fp.rooms.find((r) => r.id === item.roomId);
      if (!room) continue;
      const { w, h } = getEffectiveBounds(item);
      const leftGap = item.x - room.x;
      const rightGap = (room.x + room.width) - (item.x + w);
      const bottomGap = (room.y + room.height) - (item.y + h);
      if (leftGap < 2 && rightGap < 2) {
        errors.push({
          severity: "warning",
          message: `Bed "${item.name}" has less than 2ft clearance on both sides (left: ${leftGap}ft, right: ${rightGap}ft).`,
        });
      }
      if (bottomGap < 2) {
        errors.push({
          severity: "warning",
          message: `Bed "${item.name}" has less than 2ft clearance at the foot (${bottomGap}ft).`,
        });
      }
    }
  }

  return errors;
}

// ---- Skill Definition ----

export const furnitureLayoutSkill: Skill = {
  name: "furniture-layout",
  description: "Adds furniture placement to an existing floor plan",

  tools: [
    {
      name: "furnish_floor_plan",
      description:
        "Add furniture to an existing floor plan. Include the complete floor plan data (plot, rooms, doors, notes) " +
        "from the most recent generate_floor_plan result, plus a furniture array with positioned items. " +
        "The plan will be validated; if errors are returned, fix the issues and call again.",
      input_schema: FURNISH_FLOOR_PLAN_SCHEMA,
    },
  ],

  handlers: {
    furnish_floor_plan: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.furniture || floorPlan.furniture.length === 0) {
        return {
          content: "No furniture items provided. Add at least one furniture item and call again.",
          isError: true,
        };
      }

      const validationErrors = validateFurniture(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors
          .map((e, i) => `${i + 1}. ${e.message}`)
          .join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";

        return {
          content: `Furniture validation failed with ${hardErrors.length} error(s). Fix these and call the tool again:\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const roomCount = new Set(floorPlan.furniture.map((f) => f.roomId)).size;

      return {
        content: `Floor plan furnished successfully with ${floorPlan.furniture.length} items across ${roomCount} rooms.${warningNote}`,
        artifact: {
          kind: "floor_plan",
          data: floorPlan,
        },
      };
    },
  },

  systemPrompt: FURNITURE_LAYOUT_SYSTEM_PROMPT,
};
