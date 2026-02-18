export const STYLE_PALETTE_SCHEMA = {
  type: "object" as const,
  properties: {
    overallStyle: {
      type: "string" as const,
      description: "Overall interior design style (e.g., 'Modern Minimalist', 'Scandinavian', 'Industrial')",
    },
    colorScheme: {
      type: "string" as const,
      description: "Color scheme description (e.g., 'Warm neutrals with navy accents')",
    },
    rooms: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          roomId: {
            type: "string" as const,
            description: "ID of the room from the floor plan",
          },
          roomName: { type: "string" as const },
          flooringType: {
            type: "string" as const,
            description: "Flooring material (e.g., 'Hardwood Oak', 'Porcelain Tile', 'Carpet')",
          },
          flooringColor: {
            type: "string" as const,
            description: "Hex color for the flooring",
          },
          wallColor: {
            type: "string" as const,
            description: "Hex color for the walls",
          },
          accentColor: {
            type: "string" as const,
            description: "Hex color for accents (trim, fixtures, hardware)",
          },
          materials: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "List of recommended materials (e.g., 'Marble countertop', 'Brass hardware')",
          },
          notes: {
            type: "string" as const,
            description: "Additional design notes for this room",
          },
        },
        required: ["roomId", "roomName", "flooringType", "flooringColor", "wallColor", "accentColor", "materials"],
      },
    },
    notes: {
      type: "string" as const,
      description: "Overall design notes and recommendations",
    },
  },
  required: ["overallStyle", "colorScheme", "rooms", "notes"],
};
