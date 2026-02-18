export const FLOOR_PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    plot: {
      type: "object" as const,
      properties: {
        width: { type: "number" as const, minimum: 10, maximum: 500 },
        height: { type: "number" as const, minimum: 10, maximum: 500 },
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
          x: { type: "number" as const, minimum: 0 },
          y: { type: "number" as const, minimum: 0 },
          width: { type: "number" as const, minimum: 3 },
          height: { type: "number" as const, minimum: 3 },
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
          x: { type: "number" as const, minimum: 0 },
          y: { type: "number" as const, minimum: 0 },
          width: { type: "number" as const, minimum: 2, maximum: 6 },
          orientation: {
            type: "string" as const,
            enum: ["horizontal", "vertical"],
          },
          swingDirection: {
            type: "string" as const,
            enum: ["inward", "outward"],
            description:
              "Direction the door swings. 'inward' swings into the fromRoom, 'outward' into the toRoom. Default: inward for most doors, outward for bathrooms.",
          },
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
          roomId: {
            type: "string" as const,
            description: "The room this window belongs to",
          },
          x: { type: "number" as const, minimum: 0 },
          y: { type: "number" as const, minimum: 0 },
          width: {
            type: "number" as const,
            minimum: 2,
            maximum: 8,
            description: "Window width along the wall in feet",
          },
          orientation: {
            type: "string" as const,
            enum: ["horizontal", "vertical"],
          },
        },
        required: ["id", "roomId", "x", "y", "width", "orientation"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "doors", "windows", "notes"],
};
