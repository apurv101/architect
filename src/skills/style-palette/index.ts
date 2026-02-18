import type { Skill } from "../types";
import type { ToolHandlerResult } from "../../agent/types";
import type { StylePalette } from "../../lib/types";
import { STYLE_PALETTE_SCHEMA } from "./schema";
import { STYLE_PALETTE_SYSTEM_PROMPT } from "./prompt";

interface ValidationError {
  severity: "error" | "warning";
  message: string;
}

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

function validateStylePalette(palette: StylePalette): ValidationError[] {
  const errors: ValidationError[] = [];

  if (palette.rooms.length === 0) {
    errors.push({
      severity: "error",
      message: "Style palette must include at least one room.",
    });
  }

  for (const room of palette.rooms) {
    if (!room.roomId || !room.roomName) {
      errors.push({
        severity: "error",
        message: `Room entry missing roomId or roomName.`,
      });
    }

    if (!HEX_REGEX.test(room.flooringColor)) {
      errors.push({
        severity: "warning",
        message: `Room "${room.roomName}" flooring color "${room.flooringColor}" is not a valid hex color.`,
      });
    }
    if (!HEX_REGEX.test(room.wallColor)) {
      errors.push({
        severity: "warning",
        message: `Room "${room.roomName}" wall color "${room.wallColor}" is not a valid hex color.`,
      });
    }
    if (!HEX_REGEX.test(room.accentColor)) {
      errors.push({
        severity: "warning",
        message: `Room "${room.roomName}" accent color "${room.accentColor}" is not a valid hex color.`,
      });
    }

    if (room.materials.length === 0) {
      errors.push({
        severity: "warning",
        message: `Room "${room.roomName}" has no material recommendations.`,
      });
    }
  }

  if (!palette.overallStyle) {
    errors.push({
      severity: "error",
      message: "Overall style must be specified.",
    });
  }

  return errors;
}

export const stylePaletteSkill: Skill = {
  name: "style-palette",
  description: "Generates interior style and color palette recommendations",

  tools: [
    {
      name: "generate_style_palette",
      description:
        "Generate an interior design style palette with room-by-room color and material recommendations. " +
        "Analyze the floor plan rooms to create a cohesive design scheme. " +
        "Returns styled room data with hex colors and material lists.",
      input_schema: STYLE_PALETTE_SCHEMA,
    },
  ],

  handlers: {
    generate_style_palette: async (input: unknown): Promise<ToolHandlerResult> => {
      const palette = input as StylePalette;

      const validationErrors = validateStylePalette(palette);
      const hardErrors = validationErrors.filter((e) => e.severity === "error");
      const warnings = validationErrors.filter((e) => e.severity === "warning");

      if (hardErrors.length > 0) {
        const errorReport = hardErrors.map((e, i) => `${i + 1}. ${e.message}`).join("\n");
        return {
          content: `Style palette validation failed:\n\n${errorReport}`,
          isError: true,
        };
      }

      const warningNote =
        warnings.length > 0
          ? ` Warnings: ${warnings.map((w) => w.message).join("; ")}`
          : "";

      return {
        content: `Style palette generated: "${palette.overallStyle}" theme for ${palette.rooms.length} rooms.${warningNote}`,
        artifact: { kind: "style_palette", data: palette },
      };
    },
  },

  systemPrompt: STYLE_PALETTE_SYSTEM_PROMPT,
};
