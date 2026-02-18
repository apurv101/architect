import type { FloorPlan, CostEstimate, ElevationView, StylePalette } from "../lib/types";
import type { ProviderId } from "./providers/types";

/**
 * An artifact produced by a tool execution.
 * The `kind` discriminator lets the UI know what to render.
 * Add new variants here as new skills are created.
 */
export type Artifact =
  | { kind: "floor_plan"; data: FloorPlan }
  | { kind: "cost_estimate"; data: CostEstimate }
  | { kind: "elevation_view"; data: ElevationView }
  | { kind: "style_palette"; data: StylePalette };

/** What a tool handler returns after execution. */
export interface ToolHandlerResult {
  /** Text content sent back as tool_result to the model */
  content: string;
  /** Optional artifact produced (e.g., a floor plan) */
  artifact?: Artifact;
  /** If true, the tool result is marked as an error */
  isError?: boolean;
}

/** A tool handler function. */
export type ToolHandler = (input: unknown) => Promise<ToolHandlerResult>;

/** What the agent returns to the caller after the agentic loop completes. */
export interface AgentResult {
  /** The final text response from the model */
  text: string;
  /** All artifacts produced during the turn */
  artifacts: Artifact[];
  /** The full updated conversation history (provider-native format) */
  messages: unknown[];
}

/** Configuration for an agent run. */
export interface AgentConfig {
  apiKey: string;
  provider: ProviderId;
  model?: string;
  maxTokens?: number;
  /** Safety cap on tool dispatch rounds (default 10) */
  maxToolRounds?: number;
}
