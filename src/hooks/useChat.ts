import { useState, useCallback, useRef } from "react";
import type { ChatMessage, FloorPlan, ThinkingStep, ImageAttachment } from "../lib/types";
import type { Artifact, ProgressEvent } from "../agent/types";
import type { ProviderId } from "../agent/providers";
import type { SkillContext } from "../skills/types";
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

  // Track the streaming assistant message ID.
  const streamingMsgId = useRef<string | null>(null);

  // Cross-turn artifact tracking for skill eligibility filtering.
  const artifactKinds = useRef<Set<Artifact["kind"]>>(new Set());

  // Reset API history and artifact tracking when provider changes (formats are incompatible).
  const currentProvider = useRef<ProviderId>(provider);
  if (currentProvider.current !== provider) {
    currentProvider.current = provider;
    apiMessages.current = [];
    artifactKinds.current = new Set();
  }

  const sendMessage = useCallback(
    async (text: string, images?: ImageAttachment[]) => {
      if ((!text.trim() && (!images || images.length === 0)) || !apiKey) return;

      setError(null);
      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: text,
        images: images && images.length > 0 ? images : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Create a streaming assistant message
      const streamId = nextId();
      streamingMsgId.current = streamId;
      const streamMsg: ChatMessage = {
        id: streamId,
        role: "assistant",
        content: "",
        thinkingSteps: [],
      };
      setMessages((prev) => [...prev, streamMsg]);

      // Snapshot for rollback on error
      const snapshot = [...apiMessages.current];

      // Progress handler — updates the streaming message in real time
      const onProgress = (event: ProgressEvent) => {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === streamId);
          if (idx === -1) return prev;

          const current = prev[idx];
          let updated: ChatMessage;

          if (event.type === "text") {
            updated = { ...current, content: current.content + event.text };
          } else if (event.type === "tool_start") {
            const step: ThinkingStep = { toolName: event.toolName, status: "running" };
            updated = {
              ...current,
              thinkingSteps: [...(current.thinkingSteps ?? []), step],
            };
          } else {
            // tool_end — update the last matching step
            const steps = [...(current.thinkingSteps ?? [])];
            for (let i = steps.length - 1; i >= 0; i--) {
              if (steps[i].toolName === event.toolName && steps[i].status === "running") {
                steps[i] = { ...steps[i], status: event.success ? "done" : "error" };
                break;
              }
            }
            updated = { ...current, thinkingSteps: steps };
          }

          const next = [...prev];
          next[idx] = updated;
          return next;
        });
      };

      try {
        const skillContext: SkillContext = {
          availableArtifacts: new Set(artifactKinds.current),
        };

        const result = await runAgent(
          { apiKey, provider, onProgress },
          apiMessages.current,
          text,
          images,
          skillContext
        );

        // Merge new artifact kinds for next turn's eligibility filtering
        for (const artifact of result.artifacts) {
          artifactKinds.current.add(artifact.kind);
        }

        // Only update canvas with the final floor plan
        const reversed = [...result.artifacts].reverse();
        const fpArtifact = reversed.find((a): a is Extract<Artifact, { kind: "floor_plan" }> => a.kind === "floor_plan");
        if (fpArtifact) {
          setFloorPlan(fpArtifact.data);
        }

        // Finalize the streaming message with the complete text and artifacts
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === streamId);
          if (idx === -1) return prev;

          const current = prev[idx];
          const next = [...prev];
          next[idx] = {
            ...current,
            content: result.text,
            artifacts: result.artifacts.length > 0 ? result.artifacts : undefined,
          };
          return next;
        });
      } catch (err) {
        // Rollback API messages to prevent corrupted conversation history
        apiMessages.current = snapshot;

        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);

        // Update streaming message with error
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === streamId);
          if (idx === -1) return prev;

          const next = [...prev];
          next[idx] = { ...prev[idx], content: `Error: ${msg}`, thinkingSteps: undefined };
          return next;
        });
      } finally {
        streamingMsgId.current = null;
        setLoading(false);
      }
    },
    [apiKey, provider]
  );

  return { messages, loading, floorPlan, error, sendMessage };
}
