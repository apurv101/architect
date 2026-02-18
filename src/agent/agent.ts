import type { AgentConfig, AgentResult, Artifact } from "./types";
import type { ImageAttachment } from "../lib/types";
import { registry } from "../skills";
import { ADAPTERS } from "./providers";

const BASE_SYSTEM_PROMPT = `You are an expert architectural design assistant. You help users design buildings, floor plans, and spaces.

Use the available tools to fulfill the user's requests. You can call tools multiple times in a single turn if needed.

If a tool returns a validation error, fix the specific issues mentioned and call the tool again immediately. Do not apologize or explain at length -- just correct the values and retry.

When you have completed the user's request, respond with a brief natural language summary describing the layout (room arrangement, total area, notable design choices).

If the user's request is ambiguous, ask clarifying questions rather than guessing.

## Image Interpretation

When the user uploads an image of an architectural floor plan or design:
1. Analyze the image carefully, identifying all rooms, their approximate dimensions, layout, and spatial relationships.
2. Estimate realistic dimensions (in feet) based on the proportions and any scale indicators visible in the image.
3. Identify room types (bedroom, bathroom, kitchen, living room, etc.) from labels, fixtures, or context.
4. Generate a structured floor plan using the generate_floor_plan tool that faithfully recreates the layout shown in the image.
5. If the image is unclear or ambiguous, describe what you see and ask the user for clarification on specific details.
6. If the image is not a floor plan, describe what you see and ask how the user would like to proceed.

When recreating a floor plan from an image, prioritize:
- Maintaining the relative positions and proportions of rooms
- Ensuring all rooms fit within the plot boundary without overlaps
- Preserving the logical flow and connections between spaces`;

/**
 * Run the agent loop for one user turn.
 *
 * Delegates to the selected provider adapter which handles
 * API calls, tool dispatch, and message history in its native format.
 */
export async function runAgent(
  config: AgentConfig,
  messages: unknown[],
  userMessage: string,
  images?: ImageAttachment[]
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
    images,
    toolHandler,
  });

  return { text, artifacts, messages };
}
