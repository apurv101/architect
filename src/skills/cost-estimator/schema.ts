export const COST_ESTIMATE_SCHEMA = {
  type: "object" as const,
  properties: {
    totalCost: {
      type: "number" as const,
      description: "Total estimated cost in the specified currency",
    },
    currency: {
      type: "string" as const,
      description: "Currency code (e.g., 'USD')",
    },
    breakdown: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          category: {
            type: "string" as const,
            description: "Cost category (e.g., 'Foundation', 'Framing', 'Electrical')",
          },
          description: {
            type: "string" as const,
            description: "Detailed description of the line item",
          },
          quantity: {
            type: "number" as const,
            description: "Quantity (sqft, linear ft, count, etc.)",
          },
          unit: {
            type: "string" as const,
            description: "Unit of measurement (e.g., 'sqft', 'linear ft', 'each')",
          },
          unitCost: {
            type: "number" as const,
            description: "Cost per unit",
          },
          totalCost: {
            type: "number" as const,
            description: "Total cost for this line item",
          },
        },
        required: ["category", "description", "totalCost"],
      },
    },
    notes: {
      type: "string" as const,
      description: "Additional notes, assumptions, and disclaimers",
    },
  },
  required: ["totalCost", "currency", "breakdown", "notes"],
};
