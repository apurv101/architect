import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan, RoomPlan } from "../../lib/types";
import { validateFloorPlan } from "../../lib/validation";
import { validateRoomPlan } from "./validators";
import { computeRoomPlacement } from "../../lib/room-placement";
import { PLAN_ROOMS_SCHEMA, FINALIZE_FLOOR_PLAN_SCHEMA } from "./schemas";
import { FLOOR_PLAN_SYSTEM_PROMPT } from "./prompt";

// ---- Skill Definition ----

export const floorPlanSkill: Skill = {
  name: "floor-plan",
  description: "Generates architectural floor plans through a 3-step workflow: plan_rooms -> finalize_floor_plan -> review_floor_plan",
  metadata: {
    category: "design",
    always: true,
  },

  tools: [
    {
      name: "plan_rooms",
      description:
        "Step 1: Define the room program — list rooms with types, target areas, dimension ranges, adjacency requirements, and zoning. " +
        "The system automatically computes optimal room coordinates. No geometry needed from you. " +
        "If errors are returned, fix the issues and call again.",
      input_schema: PLAN_ROOMS_SCHEMA,
    },
    {
      name: "finalize_floor_plan",
      description:
        "Step 2: Add doors and windows to the placed rooms to create the final floor plan. " +
        "Use the room coordinates from plan_rooms. Copy rooms exactly — do NOT change coordinates. " +
        "The plan will be structurally validated; if errors are returned, fix the issues and call again.",
      input_schema: FINALIZE_FLOOR_PLAN_SCHEMA,
    },
  ],

  handlers: {
    // ---- Tool 1: plan_rooms (validates + auto-places) ----
    plan_rooms: async (input: unknown): Promise<ToolHandlerResult> => {
      const plan = input as RoomPlan;

      // Validate the room plan (feasibility, dimensions, adjacencies)
      const validationErrors = validateRoomPlan(plan);
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
          content: `Room plan has ${hardErrors.length} error(s). Fix these and call plan_rooms again:\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      // Auto-compute room placement using the layout engine
      const placement = computeRoomPlacement(plan);

      if (!placement.success) {
        return {
          content: `Room plan validated but layout computation failed. Try simplifying: fewer rooms, wider dimension ranges, or a larger plot.`,
          isError: true,
        };
      }

      // Build room coordinate listing for the LLM
      const roomListing = placement.rooms
        .map((r) => `  ${r.name} (${r.type}): x=${r.x}, y=${r.y}, ${r.width}x${r.height}ft, color="${r.color}"`)
        .join("\n");

      const totalRoomArea = placement.rooms.reduce((s, r) => s + r.width * r.height, 0);
      const plotArea = plan.plot.width * plan.plot.height;
      const coverage = Math.round((totalRoomArea / plotArea) * 100);

      const warningSuffix =
        warnings.length > 0
          ? `\n\nWarnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const placementWarnings =
        placement.warnings.length > 0
          ? `\nPlacement notes: ${placement.warnings.join("; ")}`
          : "";

      return {
        content:
          `Room plan created and layout computed: ${placement.rooms.length} rooms on ${plan.plot.width}x${plan.plot.height} plot. ` +
          `Coverage: ${coverage}%.\n\n` +
          `Room coordinates (use these EXACTLY for finalize_floor_plan):\n${roomListing}\n\n` +
          `Proceed to finalize_floor_plan. Copy room coordinates exactly — do NOT change them. Add doors on shared walls and windows on exterior walls.` +
          `${warningSuffix}${placementWarnings}`,
        artifact: {
          kind: "blocking_layout",
          data: {
            plot: plan.plot,
            rooms: placement.rooms,
            adjacencies: plan.adjacencies.map((a) => ({
              roomId: a.roomId,
              adjacentTo: a.adjacentTo,
              strength: a.strength,
            })),
            notes: plan.notes,
          },
        },
      };
    },

    // ---- Tool 2: finalize_floor_plan ----
    finalize_floor_plan: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      const validationErrors = validateFloorPlan(floorPlan);
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
          content: `Validation failed with ${hardErrors.length} error(s). Fix these and call finalize_floor_plan again:\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      const warningSuffix =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      return {
        content:
          `Floor plan finalized with ${floorPlan.rooms.length} rooms, ${floorPlan.doors.length} doors, and ${(floorPlan.windows ?? []).length} windows. ` +
          `Proceed to review_floor_plan to check architectural quality.${warningSuffix}`,
        artifact: {
          kind: "floor_plan",
          data: floorPlan,
        },
      };
    },
  },

  systemPrompt: FLOOR_PLAN_SYSTEM_PROMPT,
};
