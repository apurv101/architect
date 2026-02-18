import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { HVAC_LAYOUT_SCHEMA } from "./schema";
import { HVAC_LAYOUT_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function validateHVAC(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const hvac = fp.hvac ?? [];

  for (const element of hvac) {
    const room = fp.rooms.find((r) => r.id === element.roomId);
    if (!room) {
      errors.push({
        severity: "error",
        message: `HVAC element "${element.name}" (${element.id}) references unknown roomId "${element.roomId}".`,
      });
      continue;
    }

    // Check within room bounds (outdoor_unit can be outside)
    if (element.type !== "outdoor_unit") {
      if (
        element.x < room.x ||
        element.y < room.y ||
        element.x + element.width > room.x + room.width ||
        element.y + element.height > room.y + room.height
      ) {
        errors.push({
          severity: "error",
          message: `HVAC element "${element.name}" at (${element.x},${element.y}) size ${element.width}x${element.height} is outside room "${room.name}" bounds.`,
        });
      }
    }
  }

  // Check every habitable room has at least one supply vent
  const roomHasSupply = new Set<string>();
  for (const e of hvac) {
    if (e.type === "supply_vent" || e.type === "mini_split") {
      roomHasSupply.add(e.roomId);
    }
  }

  const habitable = new Set(["bedroom", "bathroom", "kitchen", "living_room", "dining_room"]);
  for (const room of fp.rooms) {
    if (habitable.has(room.type) && !roomHasSupply.has(room.id)) {
      errors.push({
        severity: "warning",
        message: `Room "${room.name}" (${room.type}) has no supply vent or mini-split.`,
      });
    }
  }

  // Check return vent exists
  const hasReturn = hvac.some((e) => e.type === "return_vent");
  if (!hasReturn) {
    errors.push({
      severity: "warning",
      message: "No return vent placed. HVAC system needs at least one return air path.",
    });
  }

  // Check exhaust in bathrooms and kitchens
  const roomHasExhaust = new Set<string>();
  for (const e of hvac) {
    if (e.type === "exhaust_fan") roomHasExhaust.add(e.roomId);
  }
  for (const room of fp.rooms) {
    if ((room.type === "bathroom" || room.type === "kitchen") && !roomHasExhaust.has(room.id)) {
      errors.push({
        severity: "warning",
        message: `${room.type === "bathroom" ? "Bathroom" : "Kitchen"} "${room.name}" should have an exhaust fan.`,
      });
    }
  }

  // Validate duct runs
  for (const run of fp.ductRuns ?? []) {
    if (run.points.length < 2) {
      errors.push({
        severity: "error",
        message: `Duct run "${run.id}" must have at least 2 points.`,
      });
    }
    if (run.widthInches < 4 || run.widthInches > 24) {
      errors.push({
        severity: "warning",
        message: `Duct run "${run.id}" has unusual width: ${run.widthInches}" (typical: 6-14").`,
      });
    }
  }

  return errors;
}

export const hvacLayoutSkill: Skill = {
  name: "hvac-layout",
  description: "Adds HVAC system layout to an existing floor plan",

  tools: [
    {
      name: "add_hvac_layout",
      description:
        "Add HVAC elements (vents, furnace, thermostat, ducts) to an existing floor plan. " +
        "Include the complete floor plan data, plus hvac and optional ductRuns arrays. " +
        "Validation checks HVAC requirements; fix errors and retry if needed.",
      input_schema: HVAC_LAYOUT_SCHEMA,
    },
  ],

  handlers: {
    add_hvac_layout: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.hvac || floorPlan.hvac.length === 0) {
        return {
          content: "No HVAC elements provided. Add at least one element and call again.",
          isError: true,
        };
      }

      const validationErrors = validateHVAC(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `HVAC layout validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const ductCount = (floorPlan.ductRuns ?? []).length;

      return {
        content: `HVAC layout added with ${floorPlan.hvac.length} elements and ${ductCount} duct runs.${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: HVAC_LAYOUT_SYSTEM_PROMPT,
};
