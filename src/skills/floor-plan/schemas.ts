// ---- Shared fragments ----

const PLOT_SCHEMA = {
  type: "object" as const,
  properties: {
    width: { type: "number" as const, minimum: 10, maximum: 500 },
    height: { type: "number" as const, minimum: 10, maximum: 500 },
    area: { type: "number" as const },
  },
  required: ["width", "height", "area"],
};

const ROOM_TYPE_ENUM = [
  "bedroom", "bathroom", "kitchen", "living_room",
  "dining_room", "hallway", "garage", "balcony",
  "utility", "entrance", "other",
];

// ---- Tool 1: plan_rooms ----
// The handler validates the room plan AND auto-computes room coordinates
// using a deterministic layout engine. The LLM does not need to compute geometry.

export const PLAN_ROOMS_SCHEMA = {
  type: "object" as const,
  properties: {
    plot: PLOT_SCHEMA,
    rooms: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          type: { type: "string" as const, enum: ROOM_TYPE_ENUM },
          zone: {
            type: "string" as const,
            enum: ["public", "private", "service"],
            description: "Architectural zone: public (near entrance), private (bedrooms/baths), service (kitchen/utility/garage)",
          },
          targetArea: {
            type: "number" as const,
            minimum: 15,
            description: "Target area in square feet",
          },
          widthRange: {
            type: "array" as const,
            items: { type: "number" as const, minimum: 3 },
            minItems: 2,
            maxItems: 2,
            description: "Preferred width range [min, max] in feet",
          },
          heightRange: {
            type: "array" as const,
            items: { type: "number" as const, minimum: 3 },
            minItems: 2,
            maxItems: 2,
            description: "Preferred height range [min, max] in feet",
          },
        },
        required: ["id", "name", "type", "zone", "targetArea", "widthRange", "heightRange"],
      },
    },
    adjacencies: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          roomId: { type: "string" as const },
          adjacentTo: { type: "string" as const },
          strength: {
            type: "string" as const,
            enum: ["required", "preferred"],
          },
          reason: { type: "string" as const },
        },
        required: ["roomId", "adjacentTo", "strength", "reason"],
      },
    },
    entryRoomId: {
      type: "string" as const,
      description: "Room ID of the main entry point",
    },
    entryEdge: {
      type: "string" as const,
      enum: ["top", "bottom", "left", "right"],
      description: "Which plot edge the entry faces",
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "adjacencies", "entryRoomId", "entryEdge", "notes"],
};

// ---- Tool 2: finalize_floor_plan ----

export const FINALIZE_FLOOR_PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    plot: PLOT_SCHEMA,
    rooms: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          type: { type: "string" as const, enum: ROOM_TYPE_ENUM },
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
