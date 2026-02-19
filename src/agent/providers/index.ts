import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProviderId, ProviderAdapter, ProviderConfig } from "./types";
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";
import { geminiAdapter } from "./gemini";

/** Fast models used for internal review calls (cheaper/faster than main models). */
const REVIEW_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
};

/**
 * Make a single-turn LLM completion (no tool loop).
 * Used for internal review calls that need LLM reasoning.
 */
export async function simpleCompletion(
  provider: ProviderId,
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  switch (provider) {
    case "anthropic": {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const response = await client.messages.create({
        model: REVIEW_MODELS.anthropic,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
    }
    case "openai": {
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const response = await client.chat.completions.create({
        model: REVIEW_MODELS.openai,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      return response.choices[0]?.message?.content ?? "";
    }
    case "gemini": {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: REVIEW_MODELS.gemini,
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(userMessage);
      return result.response.text();
    }
  }
}

export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  anthropic: {
    id: "anthropic",
    name: "Claude",
    defaultModel: "claude-sonnet-4-20250514",
    placeholder: "sk-ant-...",
    storageKey: "archai-api-key-anthropic",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o",
    placeholder: "sk-...",
    storageKey: "archai-api-key-openai",
  },
  gemini: {
    id: "gemini",
    name: "Gemini",
    defaultModel: "gemini-2.0-flash",
    placeholder: "AI...",
    storageKey: "archai-api-key-gemini",
  },
};

export const ADAPTERS: Record<ProviderId, ProviderAdapter> = {
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  gemini: geminiAdapter,
};

export { type ProviderId, type ProviderAdapter, type ProviderConfig, type CanonicalTool } from "./types";
