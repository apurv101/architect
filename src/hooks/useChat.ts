import { useState, useCallback, useRef } from "react";
import type { ChatMessage, FloorPlan, RoomPlan, SiteAnalysis, BlockingLayout, ImageAttachment } from "../lib/types";
import type { Artifact } from "../agent/types";
import type { ProviderId } from "../agent/providers";
import { runAgent } from "../agent/agent";

let messageId = 0;
const nextId = () => `msg-${++messageId}`;

export function useChat(apiKey: string, provider: ProviderId) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [floorPlan, setFloorPlan] = useState<FloorPlan | null>(null);
  const [roomPlan, setRoomPlan] = useState<RoomPlan | null>(null);
  const [siteAnalysis, setSiteAnalysis] = useState<SiteAnalysis | null>(null);
  const [blockingLayout, setBlockingLayout] = useState<BlockingLayout | null>(null);
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

      // Snapshot for rollback on error
      const snapshot = [...apiMessages.current];

      try {
        const result = await runAgent(
          { apiKey, provider },
          apiMessages.current,
          text,
          images
        );

        // Extract latest artifacts by kind (priority: floor_plan > blocking_layout > site_analysis > room_plan)
        const reversed = [...result.artifacts].reverse();
        const fpArtifact = reversed.find((a): a is Extract<Artifact, { kind: "floor_plan" }> => a.kind === "floor_plan");
        const blArtifact = reversed.find((a): a is Extract<Artifact, { kind: "blocking_layout" }> => a.kind === "blocking_layout");
        const saArtifact = reversed.find((a): a is Extract<Artifact, { kind: "site_analysis" }> => a.kind === "site_analysis");
        const rpArtifact = reversed.find((a): a is Extract<Artifact, { kind: "room_plan" }> => a.kind === "room_plan");

        if (fpArtifact) {
          setFloorPlan(fpArtifact.data);
          setBlockingLayout(null);
          setSiteAnalysis(null);
          setRoomPlan(null);
        } else if (blArtifact) {
          setBlockingLayout(blArtifact.data);
          setSiteAnalysis(null);
          setRoomPlan(null);
        } else if (saArtifact) {
          setSiteAnalysis(saArtifact.data);
          setRoomPlan(null);
        } else if (rpArtifact) {
          setRoomPlan(rpArtifact.data);
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

  return { messages, loading, floorPlan, roomPlan, siteAnalysis, blockingLayout, error, sendMessage };
}
