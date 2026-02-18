import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, AgentResult, Artifact } from "./types";
import { registry } from "../skills";

const BASE_SYSTEM_PROMPT = `You are an expert architectural design assistant. You help users design buildings, floor plans, and spaces.

Use the available tools to fulfill the user's requests. You can call tools multiple times in a single turn if needed.

If a tool returns a validation error, fix the specific issues mentioned and call the tool again immediately. Do not apologize or explain at length -- just correct the values and retry.

When you have completed the user's request, respond with a brief natural language summary describing the layout (room arrangement, total area, notable design choices).

If the user's request is ambiguous, ask clarifying questions rather than guessing.`;

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_MAX_TOOL_ROUNDS = 10;

/**
 * Run the agent loop for one user turn.
 *
 * Calls Claude, dispatches any tool_use blocks to skill handlers,
 * feeds results back, and loops until Claude stops calling tools.
 */
export async function runAgent(
  config: AgentConfig,
  messages: Anthropic.MessageParam[],
  userMessage: string
): Promise<AgentResult> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  });

  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxToolRounds = config.maxToolRounds ?? DEFAULT_MAX_TOOL_ROUNDS;

  const tools = registry.getAllTools();
  const systemPrompt = registry.buildSystemPrompt(BASE_SYSTEM_PROMPT);

  messages.push({ role: "user", content: userMessage });

  const artifacts: Artifact[] = [];
  let finalText = "";

  for (let round = 0; round < maxToolRounds; round++) {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      tools,
    });

    messages.push({ role: "assistant", content: response.content });

    // Extract text blocks from this response
    for (const block of response.content) {
      if (block.type === "text") {
        finalText += block.text;
      }
    }

    // If Claude didn't call any tools, we're done
    if (response.stop_reason !== "tool_use") {
      break;
    }

    // Dispatch all tool calls and collect results
    const toolResultBlocks: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      const handler = registry.getHandler(block.name);
      if (!handler) {
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: Unknown tool "${block.name}"`,
          is_error: true,
        });
        continue;
      }

      try {
        const result = await handler(block.input);

        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError ?? false,
        });

        if (result.artifact) {
          artifacts.push(result.artifact);
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Tool execution failed";
        toolResultBlocks.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: ${errorMsg}`,
          is_error: true,
        });
      }
    }

    // Feed tool results back to Claude
    messages.push({ role: "user", content: toolResultBlocks });
  }

  return {
    text: finalText || "I've completed the request.",
    artifacts,
    messages,
  };
}
