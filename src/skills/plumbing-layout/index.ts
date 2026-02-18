import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { PLUMBING_LAYOUT_SCHEMA } from "./schema";
import { PLUMBING_LAYOUT_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

const WET_ROOMS = new Set(["bathroom", "kitchen", "utility"]);

function validatePlumbing(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const plumbing = fp.plumbing ?? [];

  for (const fixture of plumbing) {
    const room = fp.rooms.find((r) => r.id === fixture.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Plumbing fixture "${fixture.name}" (${fixture.id}) references unknown roomId "${fixture.roomId}".`,
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
        message: `Plumbing fixture "${fixture.name}" at (${fixture.x},${fixture.y}) is outside room "${room.name}" bounds.`,
      });
    }
  }

  // Check wet rooms have supply and drain
  const roomFixtures = new Map<string, typeof plumbing>();
  for (const f of plumbing) {
    const list = roomFixtures.get(f.roomId) ?? [];
    list.push(f);
    roomFixtures.set(f.roomId, list);
  }

  for (const room of fp.rooms) {
    if (WET_ROOMS.has(room.type)) {
      const fixtures = roomFixtures.get(room.id) ?? [];
      const hasSupply = fixtures.some((f) => f.type === "supply_line");
      const hasDrain = fixtures.some((f) => f.type === "drain_line");
      if (!hasSupply) {
        errors.push({
          severity: "warning",
          message: `Wet room "${room.name}" (${room.type}) has no supply line.`,
        });
      }
      if (!hasDrain) {
        errors.push({
          severity: "warning",
          message: `Wet room "${room.name}" (${room.type}) has no drain line.`,
        });
      }
    }
  }

  // Check water heater exists
  const hasWaterHeater = plumbing.some((f) => f.type === "water_heater");
  if (!hasWaterHeater) {
    errors.push({
      severity: "warning",
      message: "No water heater placed. Every house needs a water heater.",
    });
  }

  // Check main shutoff exists
  const hasShutoff = plumbing.some((f) => f.type === "main_shutoff");
  if (!hasShutoff) {
    errors.push({
      severity: "warning",
      message: "No main water shutoff valve placed.",
    });
  }

  // Validate plumbing runs
  for (const run of fp.plumbingRuns ?? []) {
    if (run.points.length < 2) {
      errors.push({
        severity: "error",
        message: `Plumbing run "${run.id}" must have at least 2 points.`,
      });
    }
  }

  return errors;
}

export const plumbingLayoutSkill: Skill = {
  name: "plumbing-layout",
  description: "Adds plumbing fixture and pipe layout to an existing floor plan",

  tools: [
    {
      name: "add_plumbing_layout",
      description:
        "Add plumbing fixtures and pipe runs to an existing floor plan. " +
        "Include the complete floor plan data, plus plumbing and optional plumbingRuns arrays. " +
        "Validation checks wet room requirements; fix errors and retry if needed.",
      input_schema: PLUMBING_LAYOUT_SCHEMA,
    },
  ],

  handlers: {
    add_plumbing_layout: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.plumbing || floorPlan.plumbing.length === 0) {
        return {
          content: "No plumbing fixtures provided. Add at least one fixture and call again.",
          isError: true,
        };
      }

      const validationErrors = validatePlumbing(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `Plumbing layout validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const runCount = (floorPlan.plumbingRuns ?? []).length;

      return {
        content: `Plumbing layout added with ${floorPlan.plumbing.length} fixtures and ${runCount} pipe runs.${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: PLUMBING_LAYOUT_SYSTEM_PROMPT,
};
