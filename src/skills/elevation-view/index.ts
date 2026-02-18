import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { ElevationView } from "../../lib/types";
import { ELEVATION_VIEW_SCHEMA } from "./schema";
import { ELEVATION_VIEW_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function validateElevation(view: ElevationView): ValidationError[] {
  const errors: ValidationError[] = [];

  if (view.elements.length === 0) {
    errors.push({
      severity: "error",
      message: "Elevation view must have at least one element.",
    });
  }

  if (view.width <= 0 || view.height <= 0) {
    errors.push({
      severity: "error",
      message: `Elevation dimensions must be positive: ${view.width}x${view.height}.`,
    });
  }

  if (view.wallHeight <= 0) {
    errors.push({
      severity: "error",
      message: `Wall height must be positive: ${view.wallHeight}.`,
    });
  }

  // Check elements within bounds
  for (const elem of view.elements) {
    if (elem.x < 0 || elem.y < 0) {
      errors.push({
        severity: "warning",
        message: `Element "${elem.type}" has negative coordinates (${elem.x}, ${elem.y}).`,
      });
    }
    if (elem.x + elem.width > view.width + 2) {
      errors.push({
        severity: "warning",
        message: `Element "${elem.type}" extends beyond view width at x=${elem.x}, width=${elem.width}.`,
      });
    }
  }

  // Check we have at least a wall
  const hasWall = view.elements.some((e) => e.type === "wall");
  if (!hasWall) {
    errors.push({
      severity: "warning",
      message: "Elevation should include at least one wall element.",
    });
  }

  return errors;
}

export const elevationViewSkill: Skill = {
  name: "elevation-view",
  description: "Generates exterior elevation views of the building",

  tools: [
    {
      name: "generate_elevation_view",
      description:
        "Generate an exterior elevation view (front, back, left, or right face) of the building. " +
        "Analyze the floor plan to determine window/door positions and building dimensions. " +
        "Returns a structured elevation with positioned elements for SVG rendering.",
      input_schema: ELEVATION_VIEW_SCHEMA,
    },
  ],

  handlers: {
    generate_elevation_view: async (input: unknown): Promise<ToolHandlerResult> => {
      const view = input as ElevationView;

      const validationErrors = validateElevation(view);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        return {
          content: `Elevation view validation failed:\n\n${errorReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      return {
        content: `${view.direction} elevation view generated: ${view.width}ft wide × ${view.height}ft tall with ${view.elements.length} elements.${warningNote}`,
        artifact: { kind: "elevation_view", data: view },
      };
    },
  },

  systemPrompt: ELEVATION_VIEW_SYSTEM_PROMPT,
};
