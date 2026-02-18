export const FURNISH_FLOOR_PLAN_SCHEMA = {
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
          orientation: {
            type: "string" as const,
            enum: ["horizontal", "vertical"],
          },
          swingDirection: {
            type: "string" as const,
            enum: ["inward", "outward"],
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
          roomId: { type: "string" as const },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: { type: "number" as const },
          orientation: {
            type: "string" as const,
            enum: ["horizontal", "vertical"],
          },
        },
        required: ["id", "roomId", "x", "y", "width", "orientation"],
      },
    },
    furniture: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          roomId: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: [
              "bed", "nightstand", "dresser", "desk", "chair", "sofa",
              "coffee_table", "dining_table", "dining_chair", "tv_stand",
              "bookshelf", "wardrobe", "toilet", "sink", "bathtub",
              "shower", "kitchen_counter", "refrigerator", "stove",
              "washing_machine",
            ],
          },
          name: { type: "string" as const },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: { type: "number" as const, minimum: 1 },
          height: { type: "number" as const, minimum: 1 },
          rotation: {
            type: "number" as const,
            enum: [0, 90, 180, 270],
          },
        },
        required: ["id", "roomId", "type", "name", "x", "y", "width", "height", "rotation"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "doors", "furniture", "notes"],
};
