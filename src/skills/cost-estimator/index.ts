import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { CostEstimate } from "../../lib/types";
import { COST_ESTIMATE_SCHEMA } from "./schema";
import { COST_ESTIMATOR_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

function validateCostEstimate(estimate: CostEstimate): ValidationError[] {
  const errors: ValidationError[] = [];

  if (estimate.breakdown.length === 0) {
    errors.push({
      severity: "error",
      message: "Cost breakdown must have at least one line item.",
    });
  }

  // Check totalCost matches sum of line items
  const lineItemSum = estimate.breakdown.reduce((sum, item) => sum + item.totalCost, 0);
  const diff = Math.abs(estimate.totalCost - lineItemSum);
  if (diff > 1) {
    errors.push({
      severity: "error",
      message: `Total cost ($${estimate.totalCost}) doesn't match sum of line items ($${lineItemSum}). Difference: $${diff.toFixed(2)}.`,
    });
  }

  // Check for negative costs
  for (const item of estimate.breakdown) {
    if (item.totalCost < 0) {
      errors.push({
        severity: "error",
        message: `Line item "${item.description}" has a negative cost: $${item.totalCost}.`,
      });
    }
  }

  // Check total is reasonable (warn if very low or very high per sqft)
  if (estimate.totalCost <= 0) {
    errors.push({
      severity: "error",
      message: "Total cost must be positive.",
    });
  }

  return errors;
}

export const costEstimatorSkill: Skill = {
  name: "cost-estimator",
  description: "Generates construction cost estimates for floor plans",

  tools: [
    {
      name: "estimate_cost",
      description:
        "Generate a detailed construction cost estimate based on the current floor plan. " +
        "Analyze room sizes, types, doors, windows, and other features to calculate costs. " +
        "Returns a structured cost breakdown with categories and line items.",
      input_schema: COST_ESTIMATE_SCHEMA,
    },
  ],

  handlers: {
    estimate_cost: async (input: unknown): Promise<ToolHandlerResult> => {
      const estimate = input as CostEstimate;

      const validationErrors = validateCostEstimate(estimate);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        return {
          content: `Cost estimate validation failed:\n\n${errorReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: estimate.currency || "USD",
      }).format(estimate.totalCost);

      return {
        content: `Cost estimate generated: ${formatted} total across ${estimate.breakdown.length} line items.${warningNote}`,
        artifact: { kind: "cost_estimate", data: estimate },
      };
    },
  },

  systemPrompt: COST_ESTIMATOR_SYSTEM_PROMPT,
};
