import type Anthropic from "@anthropic-ai/sdk";
import type { FloorPlan } from "../lib/types";

/**
 * An artifact produced by a tool execution.
 * The `kind` discriminator lets the UI know what to render.
 * Add new variants here as new skills are created.
 */
export type Artifact = { kind: "floor_plan"; data: FloorPlan };

/** What a tool handler returns after execution. */
export interface ToolHandlerResult {
  /** Text content sent back as tool_result to Claude */
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
  /** The final text response from Claude */
  text: string;
  /** All artifacts produced during the turn */
  artifacts: Artifact[];
  /** The full updated conversation history (including tool_use/tool_result pairs) */
  messages: Anthropic.MessageParam[];
}

/** Configuration for an agent run. */
export interface AgentConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  /** Safety cap on tool dispatch rounds (default 10) */
  maxToolRounds?: number;
}
