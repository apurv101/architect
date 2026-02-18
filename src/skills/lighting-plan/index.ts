import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { LIGHTING_PLAN_SCHEMA } from "./schema";
import { LIGHTING_PLAN_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

const LUMENS_PER_SQFT: Record<string, number> = {
  bedroom: 10,
  bathroom: 20,
  kitchen: 30,
  living_room: 10,
  dining_room: 15,
  hallway: 5,
  garage: 15,
  utility: 20,
  entrance: 10,
};

function validateLighting(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const lighting = fp.lighting ?? [];

  for (const fixture of lighting) {
    const room = fp.rooms.find((r) => r.id === fixture.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Light fixture "${fixture.name}" (${fixture.id}) references unknown roomId "${fixture.roomId}".`,
      });
      continue;
    }

    if (
      fixture.x < room.x ||
      fixture.y < room.y ||
      fixture.x > room.x + room.width ||
      fixture.y > room.y + room.height
    ) {
      errors.push({
        severity: "error",
        message: `Light fixture "${fixture.name}" at (${fixture.x},${fixture.y}) is outside room "${room.name}" bounds.`,
      });
    }

    if (fixture.lumens <= 0) {
      errors.push({
        severity: "error",
        message: `Light fixture "${fixture.name}" has invalid lumens value: ${fixture.lumens}.`,
      });
    }

    if (fixture.coverageRadius <= 0) {
      errors.push({
        severity: "error",
        message: `Light fixture "${fixture.name}" has invalid coverage radius: ${fixture.coverageRadius}.`,
      });
    }
  }

  // Check adequate lighting per room
  const roomLumens = new Map<string, number>();
  for (const f of lighting) {
    roomLumens.set(f.roomId, (roomLumens.get(f.roomId) ?? 0) + f.lumens);
  }

  for (const room of fp.rooms) {
    const target = LUMENS_PER_SQFT[room.type];
    if (!target) continue;
    const area = room.width * room.height;
    const totalLumens = roomLumens.get(room.id) ?? 0;
    const needed = area * target;
    if (totalLumens < needed * 0.5) {
      errors.push({
        severity: "warning",
        message: `Room "${room.name}" has ${totalLumens} lumens but needs ~${needed} (${target} lumens/sqft × ${area} sqft).`,
      });
    }
  }

  // Check every habitable room has at least one light
  for (const room of fp.rooms) {
    if (room.type === "other") continue;
    const hasLight = lighting.some((f) => f.roomId === room.id);
    if (!hasLight) {
      errors.push({
        severity: "warning",
        message: `Room "${room.name}" has no light fixtures.`,
      });
    }
  }

  return errors;
}

export const lightingPlanSkill: Skill = {
  name: "lighting-plan",
  description: "Adds lighting fixture placement with coverage visualization to an existing floor plan",

  tools: [
    {
      name: "add_lighting_plan",
      description:
        "Add light fixtures to an existing floor plan with lumens and coverage radius. " +
        "Include the complete floor plan data, plus a lighting array. " +
        "Validation checks illumination standards; fix errors and retry if needed.",
      input_schema: LIGHTING_PLAN_SCHEMA,
    },
  ],

  handlers: {
    add_lighting_plan: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.lighting || floorPlan.lighting.length === 0) {
        return {
          content: "No light fixtures provided. Add at least one fixture and call again.",
          isError: true,
        };
      }

      const validationErrors = validateLighting(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `Lighting plan validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const totalLumens = floorPlan.lighting.reduce((sum, f) => sum + f.lumens, 0);

      return {
        content: `Lighting plan added with ${floorPlan.lighting.length} fixtures (${totalLumens} total lumens).${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: LIGHTING_PLAN_SYSTEM_PROMPT,
};
