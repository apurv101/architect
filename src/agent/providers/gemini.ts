import {
  GoogleGenerativeAI,
  type Content,
  type Part,
  type FunctionDeclarationSchema,
} from "@google/generative-ai";
import type { ProviderAdapter } from "./types";

export const geminiAdapter: ProviderAdapter = {
  async runAgentLoop(config) {
    const genAI = new GoogleGenerativeAI(config.apiKey);

    const functionDeclarations = config.tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema as unknown as FunctionDeclarationSchema,
    }));

    const model = genAI.getGenerativeModel({
      model: config.model ?? "gemini-2.0-flash",
      systemInstruction: config.systemPrompt,
      tools: [{ functionDeclarations }],
    });

    const maxToolRounds = config.maxToolRounds ?? 10;
    const messages = config.messages as Content[];

    messages.push({
      role: "user",
      parts: [{ text: config.userMessage }],
    });

    let finalText = "";

    for (let round = 0; round < maxToolRounds; round++) {
      const result = await model.generateContent({ contents: messages });
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts ?? [];

      messages.push({
        role: "model",
        parts,
      });

      for (const part of parts) {
        if (part.text) finalText += part.text;
      }

      const functionCalls = parts.filter(
        (p): p is Part & {
          functionCall: NonNullable<Part["functionCall"]>;
        } => !!p.functionCall
      );

      if (functionCalls.length === 0) break;

      const responseParts: Part[] = [];

      for (const fc of functionCalls) {
        const toolResult = await config.toolHandler(
          fc.functionCall.name,
          fc.functionCall.args
        );

        responseParts.push({
          functionResponse: {
            name: fc.functionCall.name,
            response: {
              content: toolResult.content,
              is_error: toolResult.isError ?? false,
            },
          },
        });
      }

      messages.push({
        role: "user",
        parts: responseParts,
      });
    }

    return { text: finalText || "I've completed the request." };
  },
};
