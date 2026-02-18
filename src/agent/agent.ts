import type { AgentConfig, AgentResult, Artifact } from "./types";
import { registry } from "../skills";
import { ADAPTERS } from "./providers";

const BASE_SYSTEM_PROMPT = `You are an expert architectural design assistant. You help users design buildings, floor plans, and spaces.

Use the available tools to fulfill the user's requests. You can call tools multiple times in a single turn if needed.

If a tool returns a validation error, fix the specific issues mentioned and call the tool again immediately. Do not apologize or explain at length -- just correct the values and retry.

When you have completed the user's request, respond with a brief natural language summary describing the layout (room arrangement, total area, notable design choices).

If the user's request is ambiguous, ask clarifying questions rather than guessing.`;

/**
 * Run the agent loop for one user turn.
 *
 * Delegates to the selected provider adapter which handles
 * API calls, tool dispatch, and message history in its native format.
 */
export async function runAgent(
  config: AgentConfig,
  messages: unknown[],
  userMessage: string
): Promise<AgentResult> {
  const adapter = ADAPTERS[config.provider];
  const tools = registry.getAllTools();
  const systemPrompt = registry.buildSystemPrompt(BASE_SYSTEM_PROMPT);

  const artifacts: Artifact[] = [];

  const toolHandler = async (name: string, input: unknown) => {
    const handler = registry.getHandler(name);
    if (!handler) {
      return { content: `Error: Unknown tool "${name}"`, isError: true };
    }
    try {
      const result = await handler(input);
      if (result.artifact) artifacts.push(result.artifact);
      return { content: result.content, isError: result.isError };
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Tool execution failed";
      return { content: `Error: ${msg}`, isError: true };
    }
  };

  const { text } = await adapter.runAgentLoop({
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    maxToolRounds: config.maxToolRounds ?? 10,
    systemPrompt,
    tools,
    messages,
    userMessage,
    toolHandler,
  });

  return { text, artifacts, messages };
}
