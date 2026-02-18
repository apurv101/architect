import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { MULTI_STORY_SCHEMA } from "./schema";
import { MULTI_STORY_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function validateVerticalCirculation(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const stair of fp.staircases ?? []) {
    const room = fp.rooms.find((r) => r.id === stair.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Staircase "${stair.id}" references unknown roomId "${stair.roomId}".`,
      });
      continue;
    }

    // Check within room bounds
    if (
      stair.x < room.x ||
      stair.y < room.y ||
      stair.x + stair.width > room.x + room.width ||
      stair.y + stair.height > room.y + room.height
    ) {
      errors.push({
        severity: "error",
        message: `Staircase "${stair.id}" at (${stair.x},${stair.y}) size ${stair.width}x${stair.height} extends outside room "${room.name}".`,
      });
    }

    // Minimum dimensions
    if (stair.width < 3) {
      errors.push({
        severity: "error",
        message: `Staircase "${stair.id}" width ${stair.width}ft is below 3ft minimum.`,
      });
    }
    if (stair.height < 6) {
      errors.push({
        severity: "error",
        message: `Staircase "${stair.id}" run length ${stair.height}ft is below 6ft minimum.`,
      });
    }
  }

  for (const elev of fp.elevators ?? []) {
    const room = fp.rooms.find((r) => r.id === elev.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Elevator "${elev.id}" references unknown roomId "${elev.roomId}".`,
      });
      continue;
    }

    if (
      elev.x < room.x ||
      elev.y < room.y ||
      elev.x + elev.width > room.x + room.width ||
      elev.y + elev.height > room.y + room.height
    ) {
      errors.push({
        severity: "error",
        message: `Elevator "${elev.id}" at (${elev.x},${elev.y}) size ${elev.width}x${elev.height} extends outside room "${room.name}".`,
      });
    }

    if (elev.width < 4) {
      errors.push({
        severity: "error",
        message: `Elevator "${elev.id}" width ${elev.width}ft is below 4ft minimum.`,
      });
    }
    if (elev.height < 5) {
      errors.push({
        severity: "error",
        message: `Elevator "${elev.id}" depth ${elev.height}ft is below 5ft minimum.`,
      });
    }
  }

  // Warn if no vertical circulation
  const totalElements = (fp.staircases ?? []).length + (fp.elevators ?? []).length;
  if (totalElements === 0) {
    errors.push({
      severity: "warning",
      message: "No staircases or elevators placed.",
    });
  }

  return errors;
}

export const multiStorySkill: Skill = {
  name: "multi-story",
  description: "Adds staircases and elevators for multi-story buildings",

  tools: [
    {
      name: "add_vertical_circulation",
      description:
        "Add staircases and elevators to a floor plan for multi-story buildings. " +
        "Include the complete floor plan data, plus staircases and/or elevators arrays. " +
        "Set floorLevel and floorName to identify the floor. Fix errors and retry if needed.",
      input_schema: MULTI_STORY_SCHEMA,
    },
  ],

  handlers: {
    add_vertical_circulation: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      const staircases = floorPlan.staircases ?? [];
      const elevators = floorPlan.elevators ?? [];

      if (staircases.length === 0 && elevators.length === 0) {
        return {
          content: "No staircases or elevators provided. Add at least one and call again.",
          isError: true,
        };
      }

      const validationErrors = validateVerticalCirculation(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `Vertical circulation validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const floorLabel = floorPlan.floorName ?? `Level ${floorPlan.floorLevel ?? 0}`;

      return {
        content: `Vertical circulation added to ${floorLabel}: ${staircases.length} staircase(s), ${elevators.length} elevator(s).${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: MULTI_STORY_SYSTEM_PROMPT,
};
