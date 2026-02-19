import type { AgentConfig, AgentResult, Artifact } from "./types";
import type { ImageAttachment } from "../lib/types";
import type { SkillContext } from "../skills/types";
import { registry } from "../skills";
import { ADAPTERS } from "./providers";

const BASE_SYSTEM_PROMPT = `You are an expert architectural design assistant. You help users design buildings, floor plans, and spaces.

## CRITICAL RULE: Always Use Tools

You MUST call tools to produce or modify floor plans. NEVER respond with only text describing what you would change. If the user asks you to create, edit, or modify a floor plan in any way, you MUST call the tools below — starting from plan_rooms. A text-only response that describes changes without calling tools is ALWAYS wrong.

## 3-Step Floor Plan Workflow

Always follow this strict sequence when creating or modifying floor plans:
1. **plan_rooms** — Define the room program (types, areas, adjacencies, zoning). The system auto-computes room coordinates.
2. **finalize_floor_plan** — Add doors and windows using the room coordinates from plan_rooms. This produces the final renderable floor plan.
3. **review_floor_plan** — Review architectural quality (reachability, privacy, adjacencies, natural light). Fix critical issues if found.

Even when modifying an existing plan (e.g., "make the kitchen bigger"), you MUST start from plan_rooms and proceed through all 3 steps. Use the previous plan from conversation history as reference, but call every tool again with updated values. Do NOT skip tools or describe changes in text.

If any tool returns a validation error, fix the specific issues mentioned and call the SAME tool again immediately. Do not apologize or explain at length — just correct the values and retry. Do not skip ahead to the next tool until the current one succeeds.

After finalize_floor_plan succeeds, ALWAYS call review_floor_plan to verify architectural quality. If the review returns critical issues, fix them by calling finalize_floor_plan again (or plan_rooms if room layout changes are needed), then review again. Maximum 2 review-fix cycles.

When you have completed the user's request, respond with a brief natural language summary describing the layout (room arrangement, total area, notable design choices). This summary should come AFTER all tool calls are complete, not instead of them.

If the user's request is ambiguous, ask clarifying questions rather than guessing.

## Image Interpretation

When the user uploads an image of an architectural floor plan or design:
1. Analyze the image carefully, identifying all rooms, their approximate dimensions, layout, and spatial relationships.
2. Estimate realistic dimensions (in feet) based on the proportions and any scale indicators visible in the image.
3. Identify room types (bedroom, bathroom, kitchen, living room, etc.) from labels, fixtures, or context.
4. Follow the 3-step workflow (plan_rooms -> finalize_floor_plan -> review_floor_plan) to recreate the layout shown in the image.
5. If the image is unclear or ambiguous, describe what you see and ask the user for clarification on specific details.
6. If the image is not a floor plan, describe what you see and ask how the user would like to proceed.

When recreating a floor plan from an image, prioritize:
- Maintaining the relative positions and proportions of rooms
- Ensuring all rooms fit within the plot boundary without overlaps
- Preserving the logical flow and connections between spaces`;

/**
 * Run the agent loop for one user turn.
 *
 * Delegates to the selected provider adapter which handles
 * API calls, tool dispatch, and message history in its native format.
 */
export async function runAgent(
  config: AgentConfig,
  messages: unknown[],
  userMessage: string,
  images?: ImageAttachment[],
  skillContext?: SkillContext
): Promise<AgentResult> {
  const adapter = ADAPTERS[config.provider];

  // Build a context-aware snapshot: filtered skills, gated tools, combined prompt.
  // The artifacts array is shared — the snapshot's dispatcher pushes artifacts into it.
  const context: SkillContext = skillContext ?? {
    availableArtifacts: new Set(),
  };
  const artifacts: Artifact[] = [];

  const snapshot = registry.buildSnapshot(
    BASE_SYSTEM_PROMPT,
    context,
    { apiKey: config.apiKey, provider: config.provider, userMessage },
    artifacts
  );

  const { text, roundsExhausted } = await adapter.runAgentLoop({
    apiKey: config.apiKey,
    model: config.model,
    maxTokens: config.maxTokens,
    maxToolRounds: config.maxToolRounds ?? 20,
    systemPrompt: snapshot.systemPrompt,
    tools: snapshot.tools,
    messages,
    userMessage,
    images,
    toolHandler: snapshot.toolHandler,
    onProgress: config.onProgress,
  });

  if (roundsExhausted && artifacts.length === 0) {
    const exhaustionNote =
      "\n\nI was unable to generate a valid floor plan after multiple attempts. " +
      "Please try rephrasing your request or simplifying the requirements (fewer rooms, different dimensions).";
    return { text: text + exhaustionNote, artifacts, messages };
  }

  return { text, artifacts, messages };
}
