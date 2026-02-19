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

// ---- Tool 2: analyze_site ----

export const ANALYZE_SITE_SCHEMA = {
  type: "object" as const,
  properties: {
    plot: PLOT_SCHEMA,
    rooms: {
      type: "array" as const,
      description: "Room list carried forward from plan_rooms (same shape).",
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          type: { type: "string" as const, enum: ROOM_TYPE_ENUM },
          zone: {
            type: "string" as const,
            enum: ["public", "private", "service"],
          },
          targetArea: { type: "number" as const, minimum: 15 },
          widthRange: {
            type: "array" as const,
            items: { type: "number" as const, minimum: 3 },
            minItems: 2,
            maxItems: 2,
          },
          heightRange: {
            type: "array" as const,
            items: { type: "number" as const, minimum: 3 },
            minItems: 2,
            maxItems: 2,
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
    entryRoomId: { type: "string" as const },
    entryEdge: {
      type: "string" as const,
      enum: ["top", "bottom", "left", "right"],
    },
    siteConstraints: {
      type: "object" as const,
      description: "Site-level constraints that influence room placement.",
      properties: {
        setbacks: {
          type: "object" as const,
          description: "Minimum distance (in feet) from plot edges that must be kept clear.",
          properties: {
            top: { type: "number" as const, minimum: 0 },
            bottom: { type: "number" as const, minimum: 0 },
            left: { type: "number" as const, minimum: 0 },
            right: { type: "number" as const, minimum: 0 },
          },
        },
        orientation: {
          type: "string" as const,
          enum: ["north_top", "north_bottom", "north_left", "north_right"],
          description: "Which plot edge faces north. Affects natural light strategy.",
        },
        preferredWindows: {
          type: "array" as const,
          items: { type: "string" as const, enum: ["top", "bottom", "left", "right"] },
          description: "Plot edges preferred for windows (e.g. south-facing for passive solar).",
        },
      },
    },
    zones: {
      type: "array" as const,
      description: "How the three architectural zones are allocated to plot regions.",
      items: {
        type: "object" as const,
        properties: {
          zone: {
            type: "string" as const,
            enum: ["public", "private", "service"],
          },
          region: {
            type: "object" as const,
            properties: {
              edge: {
                type: "string" as const,
                enum: ["top", "bottom", "left", "right", "center"],
                description: "Which part of the plot this zone occupies.",
              },
              approximateShare: {
                type: "number" as const,
                minimum: 0,
                maximum: 100,
                description: "Approximate percentage of plot area for this zone.",
              },
            },
            required: ["edge", "approximateShare"],
          },
          rooms: {
            type: "array" as const,
            items: { type: "string" as const },
            description: "Room IDs allocated to this zone region.",
          },
        },
        required: ["zone", "region", "rooms"],
      },
    },
    circulationStrategy: {
      type: "string" as const,
      description: "Description of the circulation approach: central hallway, open plan, corridor, etc.",
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "adjacencies", "entryRoomId", "entryEdge", "siteConstraints", "zones", "circulationStrategy", "notes"],
};

// ---- Tool 3: place_rooms ----

export const PLACE_ROOMS_SCHEMA = {
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
    adjacencies: {
      type: "array" as const,
      description: "Adjacency requirements from plan_rooms. The handler verifies that required adjacencies are satisfied by room placement.",
      items: {
        type: "object" as const,
        properties: {
          roomId: { type: "string" as const },
          adjacentTo: { type: "string" as const },
          strength: {
            type: "string" as const,
            enum: ["required", "preferred"],
          },
        },
        required: ["roomId", "adjacentTo", "strength"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["plot", "rooms", "adjacencies", "notes"],
};

// ---- Tool 3: finalize_floor_plan ----

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
