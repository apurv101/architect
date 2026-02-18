import { useState, useCallback, useRef } from "react";
import type { ChatMessage, FloorPlan } from "../lib/types";
import type { Artifact } from "../agent/types";
import type { ProviderId } from "../agent/providers";
import { runAgent } from "../agent/agent";

let messageId = 0;
const nextId = () => `msg-${++messageId}`;

export function useChat(apiKey: string, provider: ProviderId) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opaque provider-native message history.
  const apiMessages = useRef<unknown[]>([]);

  // Reset API history when provider changes (formats are incompatible).
  const currentProvider = useRef<ProviderId>(provider);
  if (currentProvider.current !== provider) {
    currentProvider.current = provider;
    apiMessages.current = [];
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || !apiKey) return;

      setError(null);
      const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Snapshot for rollback on error
      const snapshot = [...apiMessages.current];

      try {
        const result = await runAgent(
          { apiKey, provider },
          apiMessages.current,
          text
        );

        // Extract the latest floor plan artifact
        const floorPlanArtifact = [...result.artifacts]
          .reverse()
          .find(
            (a): a is Extract<Artifact, { kind: "floor_plan" }> =>
              a.kind === "floor_plan"
          );

        if (floorPlanArtifact) {
          setFloorPlan(floorPlanArtifact.data);
        }

        const assistantMsg: ChatMessage = {
          id: nextId(),
          role: "assistant",
          content: result.text,
          artifacts:
            result.artifacts.length > 0 ? result.artifacts : undefined,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        // Rollback API messages to prevent corrupted conversation history
        apiMessages.current = snapshot;

        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: "assistant", content: `Error: ${msg}` },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [apiKey, provider]
  );

  return { messages, loading, floorPlan, error, sendMessage };
}
