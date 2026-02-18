import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { LANDSCAPING_SCHEMA } from "./schema";
import { LANDSCAPING_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function validateLandscaping(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const landscaping = fp.landscaping ?? [];

  for (const elem of landscaping) {
    // Check within plot bounds
    if (
      elem.x < 0 || elem.y < 0 ||
      elem.x + elem.width > fp.plot.width ||
      elem.y + elem.height > fp.plot.height
    ) {
      errors.push({
        severity: "error",
        message: `Landscape element "${elem.name}" at (${elem.x},${elem.y}) size ${elem.width}x${elem.height} extends outside the plot boundary (${fp.plot.width}x${fp.plot.height}).`,
      });
    }

    // Check doesn't overlap with building rooms (warning for most, error for large structures)
    for (const room of fp.rooms) {
      if (rectsOverlap(
        elem.x, elem.y, elem.width, elem.height,
        room.x, room.y, room.width, room.height
      )) {
        const severity = elem.type === "shrub" || elem.type === "walkway" ? "warning" : "error";
        errors.push({
          severity,
          message: `Landscape element "${elem.name}" overlaps with room "${room.name}".`,
        });
      }
    }
  }

  // Check for overlapping landscape elements (warnings for overlapping plants, errors for structures)
  const structures = new Set(["driveway", "walkway", "patio", "deck", "pool", "fountain"]);
  for (let i = 0; i < landscaping.length; i++) {
    for (let j = i + 1; j < landscaping.length; j++) {
      const a = landscaping[i];
      const b = landscaping[j];
      if (rectsOverlap(a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height)) {
        const bothStructures = structures.has(a.type) && structures.has(b.type);
        errors.push({
          severity: bothStructures ? "error" : "warning",
          message: `Landscape elements "${a.name}" and "${b.name}" overlap.`,
        });
      }
    }
  }

  // Check walkway connectivity to entrance
  const hasWalkway = landscaping.some((e) => e.type === "walkway");
  if (!hasWalkway) {
    errors.push({
      severity: "warning",
      message: "No walkway to front entrance. Consider adding a path from the street/driveway to the front door.",
    });
  }

  // Check pool setback from property edge
  for (const elem of landscaping) {
    if (elem.type === "pool") {
      const leftSetback = elem.x;
      const rightSetback = fp.plot.width - (elem.x + elem.width);
      const topSetback = elem.y;
      const bottomSetback = fp.plot.height - (elem.y + elem.height);
      const minSetback = Math.min(leftSetback, rightSetback, topSetback, bottomSetback);
      if (minSetback < 3) {
        errors.push({
          severity: "warning",
          message: `Pool "${elem.name}" is only ${minSetback}ft from the property boundary (recommend 3-5ft minimum).`,
        });
      }
    }
  }

  return errors;
}

export const landscapingSkill: Skill = {
  name: "landscaping",
  description: "Adds landscaping elements to the property around the building",

  tools: [
    {
      name: "add_landscaping",
      description:
        "Add landscaping elements (trees, walkways, patio, pool, etc.) to the property. " +
        "Include the complete floor plan data, plus a landscaping array. " +
        "Elements are placed in outdoor areas around the building. Fix errors and retry if needed.",
      input_schema: LANDSCAPING_SCHEMA,
    },
  ],

  handlers: {
    add_landscaping: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.landscaping || floorPlan.landscaping.length === 0) {
        return {
          content: "No landscaping elements provided. Add at least one and call again.",
          isError: true,
        };
      }

      const validationErrors = validateLandscaping(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `Landscaping validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const typeCount = new Map<string, number>();
      for (const e of floorPlan.landscaping) {
        typeCount.set(e.type, (typeCount.get(e.type) ?? 0) + 1);
      }
      const summary = Array.from(typeCount.entries())
        .map(([t, c]) => `${c} ${t}(s)`)
        .join(", ");

      return {
        content: `Landscaping added with ${floorPlan.landscaping.length} elements: ${summary}.${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: LANDSCAPING_SYSTEM_PROMPT,
};
