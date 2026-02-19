/** Provider-agnostic tool definition. Uses JSON Schema for parameters. */
export interface CanonicalTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** Callback the adapter uses to dispatch tool calls to the skill registry. */
export type ToolDispatcher = (
  name: string,
  input: unknown
) => Promise<{ content: string; isError?: boolean }>;

/** Provider adapter interface. Each provider implements this. */
export interface ProviderAdapter {
  runAgentLoop(config: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    maxToolRounds?: number;
    systemPrompt: string;
    tools: CanonicalTool[];
    messages: unknown[];
    userMessage: string;
    images?: import("../../lib/types").ImageAttachment[];
    toolHandler: ToolDispatcher;
    onProgress?: import("../types").OnProgress;
  }): Promise<{ text: string; roundsExhausted?: boolean }>;
}

export type ProviderId = "anthropic" | "openai" | "gemini";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  defaultModel: string;
  placeholder: string;
  storageKey: string;
}
