import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { ANNOTATION_SCHEMA } from "./schema";
import { ANNOTATION_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function validateAnnotations(fp: FloorPlan): ValidationError[] {
  const errors: ValidationError[] = [];
  const annotations = fp.annotations ?? [];

  for (const ann of annotations) {
    // Check within reasonable bounds (allow some margin outside plot for notes)
    const margin = 10;
    if (
      ann.x < -margin || ann.y < -margin ||
      ann.x > fp.plot.width + margin ||
      ann.y > fp.plot.height + margin
    ) {
      errors.push({
        severity: "warning",
        message: `Annotation "${ann.id}" at (${ann.x},${ann.y}) is far outside the plot boundary.`,
      });
    }

    // Callouts need target coordinates
    if (ann.type === "callout" && (ann.targetX === undefined || ann.targetY === undefined)) {
      errors.push({
        severity: "error",
        message: `Callout annotation "${ann.id}" requires targetX and targetY for the arrow endpoint.`,
      });
    }

    // Dimensions need target coordinates
    if (ann.type === "dimension" && (ann.targetX === undefined || ann.targetY === undefined)) {
      errors.push({
        severity: "error",
        message: `Dimension annotation "${ann.id}" requires targetX and targetY for the measurement endpoints.`,
      });
    }

    // Check text is not empty
    if (!ann.text.trim()) {
      errors.push({
        severity: "error",
        message: `Annotation "${ann.id}" has empty text.`,
      });
    }
  }

  return errors;
}

export const annotationSkill: Skill = {
  name: "annotation",
  description: "Adds custom annotations, labels, and callouts to a floor plan",

  tools: [
    {
      name: "add_annotations",
      description:
        "Add text annotations, callouts, dimensions, and notes to an existing floor plan. " +
        "Include the complete floor plan data, plus an annotations array. " +
        "Supports labels, callouts with arrows, dimension lines, and boxed notes.",
      input_schema: ANNOTATION_SCHEMA,
    },
  ],

  handlers: {
    add_annotations: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      if (!floorPlan.annotations || floorPlan.annotations.length === 0) {
        return {
          content: "No annotations provided. Add at least one annotation and call again.",
          isError: true,
        };
      }

      const validationErrors = validateAnnotations(floorPlan);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        const warningReport =
          warnings.length > 0
            ? "\n\nWarnings:\n" + warnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";
        return {
          content: `Annotation validation failed with ${hardErrors.length} error(s):\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const typeCounts = new Map<string, number>();
      for (const a of floorPlan.annotations) {
        typeCounts.set(a.type, (typeCounts.get(a.type) ?? 0) + 1);
      }
      const summary = Array.from(typeCounts.entries())
        .map(([t, c]) => `${c} ${t}(s)`)
        .join(", ");

      return {
        content: `Annotations added: ${summary}.${warningNote}`,
        artifact: { kind: "floor_plan", data: floorPlan },
      };
    },
  },

  systemPrompt: ANNOTATION_SYSTEM_PROMPT,
};
