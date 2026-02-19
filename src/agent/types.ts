import type { FloorPlan, RoomPlan, BlockingLayout } from "../lib/types";
import type { ProviderId } from "./providers/types";

/**
 * An artifact produced by a tool execution.
 * The `kind` discriminator lets the UI know what to render.
 */
export type Artifact =
  | { kind: "floor_plan"; data: FloorPlan }
  | { kind: "room_plan"; data: RoomPlan }
  | { kind: "blocking_layout"; data: BlockingLayout };

/** What a tool handler returns after execution. */
export interface ToolHandlerResult {
  /** Text content sent back as tool_result to the model */
  content: string;
  /** Optional artifact produced (e.g., a floor plan) */
  artifact?: Artifact;
  /** If true, the tool result is marked as an error */
  isError?: boolean;
}

/** Context passed to tool handlers for access to agent state. */
export interface ToolHandlerContext {
  apiKey: string;
  provider: ProviderId;
  userMessage: string;
}

/** A tool handler function. */
export type ToolHandler = (
  input: unknown,
  context?: ToolHandlerContext
) => Promise<ToolHandlerResult>;

/** What the agent returns to the caller after the agentic loop completes. */
export interface AgentResult {
  /** The final text response from the model */
  text: string;
  /** All artifacts produced during the turn */
  artifacts: Artifact[];
  /** The full updated conversation history (provider-native format) */
  messages: unknown[];
}

/** Progress events emitted during the agent loop for streaming UI updates. */
export type ProgressEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; toolName: string }
  | { type: "tool_end"; toolName: string; success: boolean };

/** Callback for receiving progress events during the agent loop. */
export type OnProgress = (event: ProgressEvent) => void;

/** Configuration for an agent run. */
export interface AgentConfig {
  apiKey: string;
  provider: ProviderId;
  model?: string;
  maxTokens?: number;
  /** Safety cap on tool dispatch rounds (default 20) */
  maxToolRounds?: number;
  /** Callback for streaming progress events to the UI */
  onProgress?: OnProgress;
}
