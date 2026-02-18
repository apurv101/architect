import Anthropic from "@anthropic-ai/sdk";
import type { ProviderAdapter, CanonicalTool } from "./types";

function toAnthropicTools(tools: CanonicalTool[]): Anthropic.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));
}

export const anthropicAdapter: ProviderAdapter = {
  async runAgentLoop(config) {
    const client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const model = config.model ?? "claude-sonnet-4-20250514";
    const maxTokens = config.maxTokens ?? 8192;
    const maxToolRounds = config.maxToolRounds ?? 10;
    const tools = toAnthropicTools(config.tools);
    const messages = config.messages as Anthropic.MessageParam[];

    messages.push({ role: "user", content: config.userMessage });

    let finalText = "";

    for (let round = 0; round < maxToolRounds; round++) {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: config.systemPrompt,
        messages,
        tools,
      });

      messages.push({ role: "assistant", content: response.content });

      for (const block of response.content) {
        if (block.type === "text") finalText += block.text;
      }

      if (response.stop_reason !== "tool_use") break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        const result = await config.toolHandler(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError ?? false,
        });
      }

      messages.push({ role: "user", content: toolResults });
    }

    return { text: finalText || "I've completed the request." };
  },
};
