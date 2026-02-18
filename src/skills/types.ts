import type { CanonicalTool } from "../agent/providers/types";
import type { ToolHandler } from "../agent/types";

/**
 * A Skill is a self-contained capability the agent can use.
 * Each skill contributes tool schemas, handler functions,
 * and optionally system prompt additions.
 */
export interface Skill {
  /** Unique identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Provider-agnostic tool definitions */
  tools: CanonicalTool[];
  /** Map of tool_name → handler function */
  handlers: Record<string, ToolHandler>;
  /** Optional text appended to the system prompt when this skill is active */
  systemPrompt?: string;
}
