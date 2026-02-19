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
    const maxTokens = config.maxTokens ?? 16384;
    const maxToolRounds = config.maxToolRounds ?? 50;
    const tools = toAnthropicTools(config.tools);
    const messages = config.messages as Anthropic.MessageParam[];

    if (config.images && config.images.length > 0) {
      const contentBlocks: Anthropic.ContentBlockParam[] = config.images.map(
        (img) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: img.mediaType,
            data: img.data,
          },
        })
      );
      if (config.userMessage.trim()) {
        contentBlocks.push({ type: "text" as const, text: config.userMessage });
      }
      messages.push({ role: "user", content: contentBlocks });
    } else {
      messages.push({ role: "user", content: config.userMessage });
    }

    let finalText = "";
    let roundsExhausted = false;

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
        if (block.type === "text") {
          finalText += block.text;
          config.onProgress?.({ type: "text", text: block.text });
        }
      }

      // If the model hit the token limit, it may have been cut off mid-tool-call.
      // Ask it to continue so it can complete the tool call.
      if (response.stop_reason === "max_tokens") {
        messages.push({
          role: "user",
          content: "You were cut off. Continue from where you left off. Remember: you MUST use tools to modify floor plans.",
        });
        continue;
      }

      if (response.stop_reason !== "tool_use") break;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        config.onProgress?.({ type: "tool_start", toolName: block.name });
        const result = await config.toolHandler(block.name, block.input);
        config.onProgress?.({ type: "tool_end", toolName: block.name, success: !result.isError });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result.content,
          is_error: result.isError ?? false,
        });
      }

      messages.push({ role: "user", content: toolResults });

      if (round === maxToolRounds - 1) {
        roundsExhausted = true;
      }
    }

    return { text: finalText || "I've completed the request.", roundsExhausted };
  },
};
