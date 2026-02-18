import type { ProviderId, ProviderAdapter, ProviderConfig } from "./types";
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";
import { geminiAdapter } from "./gemini";

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
