export const LIGHTING_PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    plot: {
      type: "object" as const,
      properties: {
        width: { type: "number" as const },
        height: { type: "number" as const },
        area: { type: "number" as const },
      },
      required: ["width", "height", "area"],
    },
    rooms: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: [
              "bedroom", "bathroom", "kitchen", "living_room",
              "dining_room", "hallway", "garage", "balcony",
              "utility", "entrance", "other",
            ],
          },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: { type: "number" as const },
          height: { type: "number" as const },
          color: { type: "string" as const },
        },
        required: ["id", "name", "type", "x", "y", "width", "height", "color"],
      },
    },
    doors: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          fromRoomId: { type: "string" as const },
          toRoomId: { type: ["string", "null"] as const },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: { type: "number" as const },
          orientation: { type: "string" as const, enum: ["horizontal", "vertical"] },
          swingDirection: { type: "string" as const, enum: ["inward", "outward"] },
        },
        required: ["id", "fromRoomId", "toRoomId", "x", "y", "width", "orientation"],
      },
    },
    windows: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          roomId: { type: "string" as const },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: { type: "number" as const },
          orientation: { type: "string" as const, enum: ["horizontal", "vertical"] },
        },
        required: ["id", "roomId", "x", "y", "width", "orientation"],
      },
    },
    lighting: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          roomId: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: [
              "ceiling", "recessed", "pendant", "chandelier",
              "sconce", "track", "under_cabinet", "floor_lamp", "table_lamp",
            ],
          },
          name: { type: "string" as const },
          x: { type: "number" as const },
          y: { type: "number" as const },
          lumens: {
            type: "number" as const,
            description: "Light output in lumens",
          },
          coverageRadius: {
            type: "number" as const,
            description: "Coverage radius in feet",
          },
        },
        required: ["id", "roomId", "type", "name", "x", "y", "lumens", "coverageRadius"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "doors", "lighting", "notes"],
};
