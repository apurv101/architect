export const ELEVATION_VIEW_SCHEMA = {
  type: "object" as const,
  properties: {
    direction: {
      type: "string" as const,
      enum: ["north", "south", "east", "west"],
      description: "Which face of the building to show (north = back, south = front, east = right, west = left)",
    },
    width: {
      type: "number" as const,
      description: "Total width of the elevation view in feet",
    },
    height: {
      type: "number" as const,
      description: "Total height of the elevation view in feet (foundation to roof peak)",
    },
    wallHeight: {
      type: "number" as const,
      description: "Height of walls in feet (typically 8-10ft per story)",
    },
    roofHeight: {
      type: "number" as const,
      description: "Height from wall top to roof peak in feet",
    },
    elements: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: {
            type: "string" as const,
            enum: ["wall", "window", "door", "roof", "foundation", "chimney", "column"],
          },
          x: {
            type: "number" as const,
            description: "X position from left edge in feet",
          },
          y: {
            type: "number" as const,
            description: "Y position from top of view in feet (0 = roof peak, increases downward)",
          },
          width: { type: "number" as const },
          height: { type: "number" as const },
          fill: {
            type: "string" as const,
            description: "Fill color (hex)",
          },
          stroke: {
            type: "string" as const,
            description: "Stroke color (hex)",
          },
        },
        required: ["type", "x", "y", "width", "height"],
      },
    },
    notes: { type: "string" as const },
  },
  required: ["direction", "width", "height", "wallHeight", "roofHeight", "elements", "notes"],
};
