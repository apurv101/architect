import OpenAI from "openai";
import type { ProviderAdapter, CanonicalTool } from "./types";

function toOpenAITools(
  tools: CanonicalTool[]
): OpenAI.ChatCompletionTool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as OpenAI.FunctionParameters,
    },
  }));
}

export const openaiAdapter: ProviderAdapter = {
  async runAgentLoop(config) {
    const client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true,
    });

    const model = config.model ?? "gpt-4o";
    const maxTokens = config.maxTokens ?? 16384;
    const maxToolRounds = config.maxToolRounds ?? 50;
    const tools = toOpenAITools(config.tools);
    const messages =
      config.messages as OpenAI.ChatCompletionMessageParam[];

    // Ensure system message is first
    if (messages.length === 0 || messages[0].role !== "system") {
      messages.unshift({ role: "system", content: config.systemPrompt });
    }

    if (config.images && config.images.length > 0) {
      const contentParts: OpenAI.ChatCompletionContentPart[] = config.images.map(
        (img) => ({
          type: "image_url" as const,
          image_url: { url: `data:${img.mediaType};base64,${img.data}` },
        })
      );
      if (config.userMessage.trim()) {
        contentParts.push({ type: "text" as const, text: config.userMessage });
      }
      messages.push({ role: "user", content: contentParts });
    } else {
      messages.push({ role: "user", content: config.userMessage });
    }

    let finalText = "";
    let roundsExhausted = false;

    for (let round = 0; round < maxToolRounds; round++) {
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages,
        tools,
      });

      const choice = response.choices[0];
      const assistantMsg = choice.message;

      messages.push(assistantMsg);

      if (assistantMsg.content) {
        finalText += assistantMsg.content;
        config.onProgress?.({ type: "text", text: assistantMsg.content });
      }

      // If the model hit the token limit, it may have been cut off mid-tool-call.
      // Ask it to continue so it can complete the tool call.
      if (choice.finish_reason === "length") {
        messages.push({
          role: "user",
          content: "You were cut off. Continue from where you left off. Remember: you MUST use tools to modify floor plans.",
        });
        continue;
      }

      if (
        choice.finish_reason !== "tool_calls" ||
        !assistantMsg.tool_calls?.length
      ) {
        break;
      }

      for (const toolCall of assistantMsg.tool_calls) {
        if (toolCall.type !== "function") continue;

        let args: unknown;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Error: Failed to parse tool arguments`,
          });
          continue;
        }

        config.onProgress?.({ type: "tool_start", toolName: toolCall.function.name });
        const result = await config.toolHandler(
          toolCall.function.name,
          args
        );
        config.onProgress?.({ type: "tool_end", toolName: toolCall.function.name, success: !result.isError });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result.content,
        });
      }

      if (round === maxToolRounds - 1) {
        roundsExhausted = true;
      }
    }

    return { text: finalText || "I've completed the request.", roundsExhausted };
  },
};
