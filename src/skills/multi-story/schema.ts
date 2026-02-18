export const MULTI_STORY_SCHEMA = {
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
    staircases: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          roomId: {
            type: "string" as const,
            description: "Room containing the staircase",
          },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: {
            type: "number" as const,
            minimum: 3,
            description: "Staircase width in feet (min 3ft)",
          },
          height: {
            type: "number" as const,
            minimum: 6,
            description: "Staircase run length in feet (min 6ft)",
          },
          direction: {
            type: "string" as const,
            enum: ["up", "down", "both"],
            description: "Direction of travel from this floor",
          },
          orientation: {
            type: "string" as const,
            enum: ["horizontal", "vertical"],
            description: "horizontal = steps run left-right, vertical = steps run up-down in plan view",
          },
        },
        required: ["id", "roomId", "x", "y", "width", "height", "direction", "orientation"],
      },
    },
    elevators: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          roomId: {
            type: "string" as const,
            description: "Room containing the elevator",
          },
          x: { type: "number" as const },
          y: { type: "number" as const },
          width: {
            type: "number" as const,
            minimum: 4,
            description: "Elevator shaft width (min 4ft)",
          },
          height: {
            type: "number" as const,
            minimum: 5,
            description: "Elevator shaft depth (min 5ft)",
          },
        },
        required: ["id", "roomId", "x", "y", "width", "height"],
      },
    },
    floorLevel: {
      type: "number" as const,
      description: "Floor level number (0 = ground, 1 = first floor, -1 = basement)",
    },
    floorName: {
      type: "string" as const,
      description: "Human-readable floor name (e.g., 'Ground Floor', 'Second Floor')",
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "doors", "staircases", "notes"],
};
