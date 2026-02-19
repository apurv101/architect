import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { FloorPlan, RoomPlan, SiteAnalysis, Room } from "../../lib/types";
import { validateFloorPlan } from "../../lib/validation";
import { validateRoomPlan, validateRoomPlacement, validateAdjacencies, validateSiteAnalysis } from "./validators";
import { PLAN_ROOMS_SCHEMA, ANALYZE_SITE_SCHEMA, PLACE_ROOMS_SCHEMA, FINALIZE_FLOOR_PLAN_SCHEMA } from "./schemas";
import { FLOOR_PLAN_SYSTEM_PROMPT } from "./prompt";

// ---- Skill Definition ----

export const floorPlanSkill: Skill = {
  name: "floor-plan",
  description: "Generates architectural floor plans through a 5-step workflow: plan_rooms -> analyze_site -> place_rooms -> finalize_floor_plan -> review_floor_plan",

  tools: [
    {
      name: "plan_rooms",
      description:
        "Step 1: Define the room program — list rooms with types, target areas, dimension ranges, adjacency requirements, and zoning. " +
        "No coordinates or geometry yet. The plan will be validated for feasibility; if errors are returned, fix the issues and call again.",
      input_schema: PLAN_ROOMS_SCHEMA,
    },
    {
      name: "analyze_site",
      description:
        "Step 2: Analyze the site and create a zoning strategy. Allocate rooms to plot regions (top/bottom/left/right/center) " +
        "based on architectural zones (public/private/service), site constraints (setbacks, orientation), and circulation strategy. " +
        "Carry forward all rooms and adjacencies from plan_rooms. If errors are returned, fix and call again.",
      input_schema: ANALYZE_SITE_SCHEMA,
    },
    {
      name: "place_rooms",
      description:
        "Step 3: Assign exact coordinates (x, y, width, height) to each room on the plot, following the zoning strategy from analyze_site. " +
        "Include adjacency requirements. Placement will be validated for bounds, overlaps, and adjacency satisfaction; if errors are returned, fix and call again.",
      input_schema: PLACE_ROOMS_SCHEMA,
    },
    {
      name: "finalize_floor_plan",
      description:
        "Step 4: Add doors and windows to the placed rooms to create the final floor plan. " +
        "The plan will be structurally validated (bounds, overlaps, door/window placement); if errors are returned, fix the issues and call again.",
      input_schema: FINALIZE_FLOOR_PLAN_SCHEMA,
    },
  ],

  handlers: {
    // ---- Tool 1: plan_rooms ----
    plan_rooms: async (input: unknown): Promise<ToolHandlerResult> => {
      const plan = input as RoomPlan;

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

      // Build summary
      const totalArea = plan.rooms.reduce((sum, r) => sum + r.targetArea, 0);
      const zoneGroups = { public: 0, private: 0, service: 0 };
      for (const room of plan.rooms) {
        zoneGroups[room.zone]++;
      }
      const requiredAdj = plan.adjacencies.filter((a) => a.strength === "required").length;
      const preferredAdj = plan.adjacencies.filter((a) => a.strength === "preferred").length;

      const warningSuffix =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      return {
        content:
          `Room plan created: ${plan.rooms.length} rooms totaling ~${totalArea} sqft on ${plan.plot.width}x${plan.plot.height} plot. ` +
          `Zones: ${zoneGroups.public} public, ${zoneGroups.private} private, ${zoneGroups.service} service. ` +
          `${requiredAdj} required + ${preferredAdj} preferred adjacencies. ` +
          `Entry via "${plan.rooms.find((r) => r.id === plan.entryRoomId)?.name}" on ${plan.entryEdge} edge. ` +
          `Proceed to place_rooms to assign coordinates.${warningSuffix}`,
        artifact: {
          kind: "room_plan",
          data: plan,
        },
      };
    },

    // ---- Tool 2: analyze_site ----
    analyze_site: async (input: unknown): Promise<ToolHandlerResult> => {
      const analysis = input as SiteAnalysis;

      const validationErrors = validateSiteAnalysis(analysis);
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
          content: `Site analysis has ${hardErrors.length} error(s). Fix these and call analyze_site again:\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      // Build summary
      const zoneDesc = analysis.zones
        .map((z) => `${z.zone} (${z.region.edge}, ~${z.region.approximateShare}%): ${z.rooms.length} rooms`)
        .join("; ");

      const constraintNotes: string[] = [];
      if (analysis.siteConstraints.orientation) {
        constraintNotes.push(`north at ${analysis.siteConstraints.orientation.replace("north_", "")}`);
      }
      if (analysis.siteConstraints.setbacks) {
        const s = analysis.siteConstraints.setbacks;
        const parts = Object.entries(s).filter(([, v]) => v && v > 0).map(([k, v]) => `${k}:${v}ft`);
        if (parts.length > 0) constraintNotes.push(`setbacks ${parts.join(", ")}`);
      }
      if (analysis.siteConstraints.preferredWindows?.length) {
        constraintNotes.push(`preferred windows: ${analysis.siteConstraints.preferredWindows.join(", ")}`);
      }

      const constraintSuffix = constraintNotes.length > 0
        ? ` Site constraints: ${constraintNotes.join("; ")}.`
        : "";

      const warningSuffix =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      return {
        content:
          `Site analysis complete: ${analysis.rooms.length} rooms allocated across ${analysis.zones.length} zones. ` +
          `Zones: ${zoneDesc}. ` +
          `Circulation: ${analysis.circulationStrategy}. Entry on ${analysis.entryEdge} edge.${constraintSuffix} ` +
          `Proceed to place_rooms to assign exact coordinates.${warningSuffix}`,
        artifact: {
          kind: "site_analysis",
          data: analysis,
        },
      };
    },

    // ---- Tool 3: place_rooms ----
    place_rooms: async (input: unknown): Promise<ToolHandlerResult> => {
      const data = input as { plot: FloorPlan["plot"]; rooms: Room[]; adjacencies: { roomId: string; adjacentTo: string; strength: "required" | "preferred" }[]; notes: string };

      // Geometry validation
      const placementErrors = validateRoomPlacement(data.plot, data.rooms);
      const hardErrors = placementErrors.filter((e) => e.severity === "error");
      const warnings = placementErrors.filter((e) => e.severity === "warning");

      // Adjacency validation
      const adjErrors = validateAdjacencies(data.rooms, data.adjacencies);
      const adjHard = adjErrors.filter((e) => e.severity === "error");
      const adjWarnings = adjErrors.filter((e) => e.severity === "warning");

      const allHard = [...hardErrors, ...adjHard];
      const allWarnings = [...warnings, ...adjWarnings];

      if (allHard.length > 0) {
        const errorReport = allHard
          .map((e, i) => `${i + 1}. ${e.message}`)
          .join("\n");
        const warningReport =
          allWarnings.length > 0
            ? "\n\nWarnings:\n" + allWarnings.map((w, i) => `${i + 1}. ${w.message}`).join("\n")
            : "";

        return {
          content: `Placement has ${allHard.length} error(s). Fix these and call place_rooms again:\n\n${errorReport}${warningReport}`,
          isError: true,
        };
      }

      // Coverage check (warning only)
      const totalRoomArea = data.rooms.reduce((sum, r) => sum + r.width * r.height, 0);
      const plotArea = data.plot.width * data.plot.height;
      const coverage = Math.round((totalRoomArea / plotArea) * 100);

      const warningSuffix =
        allWarnings.length > 0
          ? ` Warnings: ${allWarnings.map((w) => w.message).join("; ")}`
          : "";

      const coverageNote = coverage < 80
        ? ` Note: rooms cover only ${coverage}% of plot — consider expanding rooms or adding utility space.`
        : "";

      return {
        content:
          `Room placement validated: ${data.rooms.length} rooms placed on ${data.plot.width}x${data.plot.height} plot. ` +
          `No overlaps, all within bounds. Coverage: ${coverage}% of plot area. ` +
          `Proceed to finalize_floor_plan to add doors and windows.${coverageNote}${warningSuffix}`,
        artifact: {
          kind: "blocking_layout",
          data: {
            plot: data.plot,
            rooms: data.rooms,
            adjacencies: data.adjacencies ?? [],
            notes: data.notes ?? "",
          },
        },
      };
    },

    // ---- Tool 4: finalize_floor_plan ----
    finalize_floor_plan: async (input: unknown): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      // Structural validation only — architectural review is handled by review_floor_plan
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
