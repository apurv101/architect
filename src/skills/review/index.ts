import type { Skill } from "../types";
import type { ToolHandlerResult, ToolHandlerContext } from "../../agent/types";
import type { FloorPlan } from "../../lib/types";
import { reviewFloorPlan, dynamicHumanJourneyReview } from "../../lib/review";
import { REVIEW_FLOOR_PLAN_SCHEMA } from "./schema";
import { REVIEW_SYSTEM_PROMPT } from "./prompt";

export const reviewSkill: Skill = {
  name: "review",
  description:
    "Reviews floor plans for architectural quality issues beyond geometric validation",

  tools: [
    {
      name: "review_floor_plan",
      description:
        "Step 5: Review a floor plan for architectural quality issues. " +
        "Checks room reachability, privacy violations, functional adjacencies, natural light, and context-specific human journey issues. " +
        "Call this after finalize_floor_plan to verify the layout makes architectural sense. " +
        "Returns a list of issues categorized as critical, warning, or suggestion.",
      input_schema: REVIEW_FLOOR_PLAN_SCHEMA,
    },
  ],

  handlers: {
    review_floor_plan: async (
      input: unknown,
      context?: ToolHandlerContext
    ): Promise<ToolHandlerResult> => {
      const floorPlan = input as FloorPlan;

      // 1. Hardcoded architectural checks
      const result = reviewFloorPlan(floorPlan);

      // 2. Dynamic human journey review (LLM-powered, context-specific)
      if (context) {
        const dynamicIssues = await dynamicHumanJourneyReview(
          floorPlan,
          context.userMessage,
          context.apiKey,
          context.provider
        );
        result.issues.push(...dynamicIssues);
      }

      if (result.issues.length === 0) {
        return {
          content: `Architectural review PASSED. ${result.summary}. The floor plan has good room connectivity, appropriate privacy, and functional adjacencies.`,
        };
      }

      const criticals = result.issues.filter(
        (i) => i.severity === "critical"
      );
      const warnings = result.issues.filter(
        (i) => i.severity === "warning"
      );
      const suggestions = result.issues.filter(
        (i) => i.severity === "suggestion"
      );

      let report = `Architectural review: ${result.summary}\n\n`;

      if (criticals.length > 0) {
        report += `CRITICAL (must fix):\n`;
        report += criticals
          .map((i, n) => `  ${n + 1}. [${i.code}] ${i.message}`)
          .join("\n");
        report += "\n\n";
      }
      if (warnings.length > 0) {
        report += `WARNINGS (should fix):\n`;
        report += warnings
          .map((i, n) => `  ${n + 1}. [${i.code}] ${i.message}`)
          .join("\n");
        report += "\n\n";
      }
      if (suggestions.length > 0) {
        report += `SUGGESTIONS:\n`;
        report += suggestions
          .map((i, n) => `  ${n + 1}. [${i.code}] ${i.message}`)
          .join("\n");
        report += "\n";
      }

      if (criticals.length > 0) {
        report +=
          "\nFix the CRITICAL issues using finalize_floor_plan, then call review_floor_plan again to verify.";
      }

      return {
        content: report,
        isError: criticals.length > 0,
      };
    },
  },

  systemPrompt: REVIEW_SYSTEM_PROMPT,
};
