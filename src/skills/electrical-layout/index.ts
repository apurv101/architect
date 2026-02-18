import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { ELECTRICAL_LAYOUT_SCHEMA } from "./schema";
import { ELECTRICAL_LAYOUT_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

const GFCI_REQUIRED_ROOMS = new Set(["bathroom", "kitchen", "garage", "utility", "balcony"]);

function validateElectrical(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const electrical = fp.electrical ?? [];

  for (const fixture of electrical) {
    const room = fp.rooms.find((r) => r.id === fixture.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `Electrical fixture "${fixture.name}" (${fixture.id}) references unknown roomId "${fixture.roomId}".`,
      });
      continue;
    }

    // Check fixture within room bounds
    if (
      fixture.x < room.x ||
      fixture.y < room.y ||
      fixture.x > room.x + room.width ||
      fixture.y > room.y + room.height
    ) {
      errors.push({
        severity: "error",
        message: `Electrical fixture "${fixture.name}" at (${fixture.x},${fixture.y}) is outside room "${room.name}" bounds (${room.x},${room.y}) ${room.width}x${room.height}.`,
      });
    }
  }

  // Check GFCI requirements
  const roomFixtures = new Map<string, typeof electrical>();
  for (const f of electrical) {
    const list = roomFixtures.get(f.roomId) ?? [];
    list.push(f);
    roomFixtures.set(f.roomId, list);
  }

  for (const room of fp.rooms) {
    if (GFCI_REQUIRED_ROOMS.has(room.type)) {
      const fixtures = roomFixtures.get(room.id) ?? [];
      const hasGFCI = fixtures.some((f) => f.type === "gfci_outlet");
      if (!hasGFCI) {
        errors.push({
          severity: "warning",
          message: `Room "${room.name}" (${room.type}) should have at least one GFCI outlet per NEC code.`,
        });
      }
    }
  }

  // Check every room has at least one switch
  for (const room of fp.rooms) {
    if (room.type === "other") continue;
    const fixtures = roomFixtures.get(room.id) ?? [];
    const hasSwitch = fixtures.some((f) =>
      f.type === "switch" || f.type === "dimmer" || f.type === "three_way_switch"
    );
    if (!hasSwitch) {
      errors.push({
        severity: "warning",
        message: `Room "${room.name}" has no light switch.`,
      });
    }
  }

  // Check circuit references
  for (const circuit of fp.electricalCircuits ?? []) {
    for (const fixtureId of circuit.fixtures) {
      const exists = electrical.some((f) => f.id === fixtureId);
      if (!exists) {
        errors.push({
          severity: "warning",
          message: `Circuit "${circuit.name}" references unknown fixture ID "${fixtureId}".`,
        });
      }
    }
  }

  return errors;
}

export const electricalLayoutSkill: Skill = {
  name: "electrical-layout",
  description: "Adds electrical fixture placement to an existing floor plan",

  tools: [
    {
      name: "add_electrical_layout",
      description:
        "Add electrical fixtures (outlets, switches, lights) to an existing floor plan. " +
        "Include the complete floor plan data from the most recent result, plus an electrical array. " +
        "Validation ensures NEC code compliance; fix errors and retry if needed.",
      input_schema: ELECTRICAL_LAYOUT_SCHEMA,
    },
  ],

  handlers: {
    add_electrical_layout: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.electrical || floorPlan.electrical.length === 0) {
        return {
          content: "No electrical fixtures provided. Add at least one fixture and call again.",
          isError: true,
        };
      }

      const validationErrors = validateElectrical(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `Electrical layout validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const circuitCount = (floorPlan.electricalCircuits ?? []).length;

      return {
        content: `Electrical layout added with ${floorPlan.electrical.length} fixtures and ${circuitCount} circuits.${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: ELECTRICAL_LAYOUT_SYSTEM_PROMPT,
};
