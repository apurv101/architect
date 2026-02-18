export const ANNOTATION_SCHEMA = {
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
    annotations: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          type: {
            type: "string" as const,
            enum: ["label", "callout", "dimension", "note"],
            description: "label = simple text, callout = text with arrow to target, dimension = measurement line, note = boxed text",
          },
          text: {
            type: "string" as const,
            description: "The annotation text content",
          },
          x: {
            type: "number" as const,
            description: "X position of the annotation text (in feet)",
          },
          y: {
            type: "number" as const,
            description: "Y position of the annotation text (in feet)",
          },
          targetX: {
            type: "number" as const,
            description: "For callouts: X position of the arrow target point",
          },
          targetY: {
            type: "number" as const,
            description: "For callouts: Y position of the arrow target point",
          },
          fontSize: {
            type: "number" as const,
            description: "Font size in SVG pixels (default 10)",
          },
          color: {
            type: "string" as const,
            description: "Text color as hex (default #DC2626 red)",
          },
        },
        required: ["id", "type", "text", "x", "y"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "doors", "annotations", "notes"],
};
