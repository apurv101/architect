export const HVAC_LAYOUT_SCHEMA = {
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
    hvac: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          roomId: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: [
              "supply_vent", "return_vent", "outdoor_unit",
              "furnace", "thermostat", "mini_split", "exhaust_fan",
            ],
          },
          name: { type: "string" as const },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: { type: "number" as const, minimum: 0.5 },
          height: { type: "number" as const, minimum: 0.5 },
        },
        required: ["id", "roomId", "type", "name", "x", "y", "width", "height"],
      },
    },
    ductRuns: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: ["supply", "return", "exhaust"],
          },
          points: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                x: { type: "number" as const },
                y: { type: "number" as const },
              },
              required: ["x", "y"],
            },
          },
          widthInches: {
            type: "number" as const,
            description: "Duct width in inches (6-14 typical)",
          },
        },
        required: ["id", "type", "points", "widthInches"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "doors", "hvac", "notes"],
};
